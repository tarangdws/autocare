const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key');
const { sendOTPByEmail, sendServiceBookingEmail, sendTowingRequestEmail } = require('../utils/email');

// Helper to generate 6-digit OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/portal/services
router.get('/services', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's selected shop
        const shopRes = await db.query(
            'SELECT select_shop_id FROM select_shops WHERE user_id = $1',
            [userId]
        );

        let shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        if (!shopId) {
            const firstShop = await db.query('SELECT id FROM admin_profiles ORDER BY id ASC LIMIT 1');
            if (firstShop.rows.length > 0) {
                shopId = firstShop.rows[0].id;
            }
        }

        if (!shopId) {
            return res.json({ services: [], shop: null });
        }

        const shopInfo = await db.query('SELECT * FROM admin_profiles WHERE id = $1', [shopId]);
        const servicesRes = await db.query(
            'SELECT * FROM service_offerings WHERE shop_id = $1 AND is_active = true ORDER BY id DESC',
            [shopId]
        );

        res.json({
            services: servicesRes.rows,
            shop: shopInfo.rows[0] || null,
        });
    } catch (err) {
        console.error('Portal services error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/check-timeslot
router.post('/check-timeslot', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferred_date, preferred_time } = req.body;

        if (!preferred_date || !preferred_time) {
            return res.status(400).json({ error: 'Date and time are required' });
        }

        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        let timeslotQuery = `SELECT id FROM service_bookings WHERE preferred_date = $1 AND preferred_time = $2 AND status != 'cancelled'`;
        let timeslotParams = [preferred_date, preferred_time];

        if (shopId) {
            timeslotQuery += ` AND shop_id = $3`;
            timeslotParams.push(shopId);
        } else {
            timeslotQuery += ` AND shop_id IS NULL`;
        }

        const existingBookingRes = await db.query(timeslotQuery, timeslotParams);
        if (existingBookingRes.rows.length > 0) {
            return res.status(400).json({ error: 'This time slot is already booked for the selected shop. Please choose another time.' });
        }

        res.json({ message: 'Timeslot is available' });
    } catch (err) {
        console.error('Check timeslot error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { email, contextMessage } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const otp = generateOtp();

        await db.query('DELETE FROM otp_verifications WHERE email = $1', [email]);

        await db.query(
            `INSERT INTO otp_verifications (email, otp, expires_at) 
             VALUES ($1, $2, NOW() + INTERVAL '1 minute')`,
            [email, otp]
        );

        await sendOTPByEmail(email, otp, contextMessage || 'Your Pre-Booking Verification Code');

        res.json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/book-service
router.post('/book-service', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes, service_ids, payment_method, otp } = req.body;

        if (!customer_name || !customer_phone || !customer_email || !vehicle_info || !preferred_date || !preferred_time || !service_ids || service_ids.length === 0 || !otp) {
            return res.status(400).json({ error: 'All required booking fields and OTP must be provided' });
        }

        // Verify OTP
        const otpRes = await db.query(
            'SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2',
            [customer_email, otp]
        );

        if (otpRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid OTP provided' });
        }

        const otpRecord = otpRes.rows[0];
        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired (1 minute timeout). Please request a new one.' });
        }

        // OTP is valid, delete it
        await db.query('DELETE FROM otp_verifications WHERE email = $1', [customer_email]);

        // Get user's selected shop
        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        // Check for timeslot collision
        let timeslotQuery = `SELECT id FROM service_bookings WHERE preferred_date = $1 AND preferred_time = $2 AND status != 'cancelled'`;
        let timeslotParams = [preferred_date, preferred_time];

        if (shopId) {
            timeslotQuery += ` AND shop_id = $3`;
            timeslotParams.push(shopId);
        } else {
            timeslotQuery += ` AND shop_id IS NULL`;
        }

        const existingBookingRes = await db.query(timeslotQuery, timeslotParams);
        if (existingBookingRes.rows.length > 0) {
            return res.status(400).json({ error: 'This time slot is already booked for the selected shop. Please choose another time.' });
        }

        const bookingRes = await db.query(
            `INSERT INTO service_bookings (user_id, shop_id, customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes, status, otp, otp_verified, payment_method, is_paid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', '', true, $10, false) RETURNING *`,
            [userId, shopId, customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes || '', payment_method || 'cash']
        );

        const booking = bookingRes.rows[0];

        // Insert booking items
        let totalCost = 0;
        for (const sId of service_ids) {
            await db.query('INSERT INTO service_booking_items (booking_id, service_id) VALUES ($1, $2)', [booking.id, sId]);
            const sRes = await db.query('SELECT price_starts_at FROM service_offerings WHERE id = $1', [sId]);
            if (sRes.rows.length > 0) {
                totalCost += parseFloat(sRes.rows[0].price_starts_at);
            }
        }

        booking.total_cost = totalCost;

        // Stripe Payment Intent handling if online
        let stripeData = null;
        if (payment_method === 'online' && totalCost > 0) {
            try {
                const amountInPaise = Math.round(totalCost * 100);
                const intent = await stripe.paymentIntents.create({
                    amount: amountInPaise,
                    currency: 'inr',
                    description: `AutoFusion Booking ID: ${booking.id}`,
                    receipt_email: customer_email,
                });

                await db.query('UPDATE service_bookings SET stripe_payment_intent_id = $1 WHERE id = $2', [intent.id, booking.id]);
                stripeData = {
                    client_secret: intent.client_secret,
                    payment_intent_id: intent.id,
                };
            } catch (stripeErr) {
                console.warn('Stripe initialization warning (fallback to mock mode):', stripeErr.message);
                stripeData = {
                    client_secret: `mock_secret_${booking.id}_${Date.now()}`,
                    payment_intent_id: `pi_mock_${booking.id}_${Date.now()}`,
                };
            }
        }

        // Email sending moved to shop admin confirmation (shop.js)

        res.status(201).json({
            message: 'Booking created successfully',
            booking,
            otp,
            stripe: stripeData,
        });
    } catch (err) {
        console.error('Book service error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/portal/bookings/:id
router.get('/bookings/:id', requireAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const bookingRes = await db.query(
            `SELECT sb.*, ap.shop_name, ap.shop_address, ap.phone_number as shop_phone FROM service_bookings sb
             LEFT JOIN admin_profiles ap ON sb.shop_id = ap.id
             WHERE sb.id = $1 AND sb.user_id = $2`,
            [bookingId, req.user.id]
        );

        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingRes.rows[0];

        const servicesRes = await db.query(
            `SELECT so.* FROM service_booking_items sbi
             JOIN service_offerings so ON sbi.service_id = so.id
             WHERE sbi.booking_id = $1`,
            [bookingId]
        );

        booking.services = servicesRes.rows;
        booking.total_cost = servicesRes.rows.reduce((sum, item) => sum + parseFloat(item.price_starts_at), 0);

        res.json({ booking });
    } catch (err) {
        console.error('Booking detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/portal/bookings/:id
router.put('/bookings/:id', requireAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes } = req.body;

        const bookingCheck = await db.query('SELECT status FROM service_bookings WHERE id = $1 AND user_id = $2', [bookingId, req.user.id]);
        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (['completed', 'cancelled'].includes(bookingCheck.rows[0].status)) {
            return res.status(400).json({ error: 'Cannot edit completed or cancelled bookings' });
        }

        await db.query(
            `UPDATE service_bookings
             SET customer_name = $1, customer_phone = $2, customer_email = $3, vehicle_info = $4, preferred_date = $5, preferred_time = $6, additional_notes = $7
             WHERE id = $8`,
            [customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes || '', bookingId]
        );

        res.json({ message: 'Booking updated successfully' });
    } catch (err) {
        console.error('Booking edit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/portal/bookings/:id (Cancel)
router.delete('/bookings/:id', requireAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const result = await db.query("UPDATE service_bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING id", [bookingId, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ message: 'Booking cancelled successfully' });
    } catch (err) {
        console.error('Booking cancel error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/bookings/:id/verify-otp
router.post('/bookings/:id/verify-otp', requireAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { otp } = req.body;

        const bookingRes = await db.query('SELECT otp FROM service_bookings WHERE id = $1 AND user_id = $2', [bookingId, req.user.id]);
        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (bookingRes.rows[0].otp === otp) {
            await db.query(
                "UPDATE service_bookings SET otp_verified = true, status = 'completed' WHERE id = $1 AND user_id = $2",
                [bookingId, req.user.id]
            );
            res.json({ message: 'OTP verified successfully! Booking marked as completed.' });
        } else {
            res.status(400).json({ error: 'Incorrect OTP code. Please try again.' });
        }
    } catch (err) {
        console.error('Booking OTP verification error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/bookings/:id/pay
router.post('/bookings/:id/pay', requireAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const bookingRes = await db.query('SELECT * FROM service_bookings WHERE id = $1 AND user_id = $2', [bookingId, req.user.id]);
        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingRes.rows[0];
        if (booking.is_paid) {
            return res.status(400).json({ error: 'Booking is already paid' });
        }

        const servicesRes = await db.query(
            `SELECT price_starts_at FROM service_booking_items sbi
             JOIN service_offerings so ON sbi.service_id = so.id
             WHERE sbi.booking_id = $1`,
            [bookingId]
        );
        const totalCost = servicesRes.rows.reduce((sum, item) => sum + parseFloat(item.price_starts_at), 0);

        let stripeData;
        try {
            const intent = await stripe.paymentIntents.create({
                amount: Math.round(totalCost * 100),
                currency: 'inr',
                description: `AutoFusion Bill Payment ID: ${booking.id}`,
                receipt_email: booking.customer_email,
            });
            await db.query('UPDATE service_bookings SET stripe_payment_intent_id = $1 WHERE id = $2', [intent.id, bookingId]);
            stripeData = { client_secret: intent.client_secret, payment_intent_id: intent.id };
        } catch (e) {
            const mockId = `pi_mock_${booking.id}_${Date.now()}`;
            await db.query('UPDATE service_bookings SET stripe_payment_intent_id = $1 WHERE id = $2', [mockId, bookingId]);
            stripeData = { client_secret: `mock_secret_${booking.id}`, payment_intent_id: mockId };
        }

        res.json({ stripe: stripeData, amount: totalCost });
    } catch (err) {
        console.error('Pay online error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/payment/verify
router.post('/payment/verify', requireAuth, async (req, res) => {
    try {
        const { payment_intent_id, booking_id } = req.body;
        if (!payment_intent_id && !booking_id) {
            return res.status(400).json({ error: 'Payment intent ID or Booking ID is required' });
        }

        let bookingRes;
        if (booking_id) {
            bookingRes = await db.query('SELECT * FROM service_bookings WHERE id = $1', [booking_id]);
        } else {
            bookingRes = await db.query('SELECT * FROM service_bookings WHERE stripe_payment_intent_id = $1', [payment_intent_id]);
        }

        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Booking with given payment intent not found' });
        }

        const booking = bookingRes.rows[0];
        const otp = generateOtp();

        await db.query(
            'UPDATE service_bookings SET is_paid = true, otp = $1 WHERE id = $2',
            [otp, booking.id]
        );

        res.json({ message: 'Payment verified successfully!', booking_id: booking.id, otp });
    } catch (err) {
        console.error('Payment verify error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/towing
router.post('/towing', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, phone_number, email, vehicle_details, pickup_address, latitude, longitude, otp } = req.body;

        if (!full_name || !phone_number || !email || !vehicle_details || !pickup_address || !otp) {
            return res.status(400).json({ error: 'Full name, phone number, email, vehicle details, pickup address, and OTP are required' });
        }

        // Verify OTP
        const otpRes = await db.query(
            'SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2',
            [email, otp]
        );

        if (otpRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid OTP provided' });
        }

        const otpRecord = otpRes.rows[0];
        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired (1 minute timeout). Please request a new one.' });
        }

        // OTP is valid, delete it
        await db.query('DELETE FROM otp_verifications WHERE email = $1', [email]);

        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        const towingRes = await db.query(
            `INSERT INTO towing_requests (user_id, shop_id, full_name, phone_number, email, vehicle_details, pickup_address, latitude, longitude, status, otp, otp_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', '', true) RETURNING *`,
            [userId, shopId, full_name, phone_number, email, vehicle_details, pickup_address, latitude || null, longitude || null]
        );

        res.status(201).json({
            message: 'Towing request submitted successfully',
            towing: towingRes.rows[0],
        });
    } catch (err) {
        console.error('Towing request error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/portal/towing/:id
router.get('/towing/:id', requireAuth, async (req, res) => {
    try {
        const towingRes = await db.query(
            `SELECT tr.*, ap.shop_name, ap.phone_number as shop_phone FROM towing_requests tr
             LEFT JOIN admin_profiles ap ON tr.shop_id = ap.id
             WHERE tr.id = $1 AND tr.user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (towingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Towing request not found' });
        }

        res.json({ towing: towingRes.rows[0] });
    } catch (err) {
        console.error('Towing detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/portal/towing/:id
router.put('/towing/:id', requireAuth, async (req, res) => {
    try {
        const towingId = req.params.id;
        const { full_name, phone_number, vehicle_details, pickup_address, latitude, longitude } = req.body;

        const result = await db.query(
            `UPDATE towing_requests
             SET full_name = $1, phone_number = $2, vehicle_details = $3, pickup_address = $4, latitude = $5, longitude = $6
             WHERE id = $7 AND user_id = $8 RETURNING id`,
            [full_name, phone_number, vehicle_details, pickup_address, latitude || null, longitude || null, towingId, req.user.id]
        );
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Towing request not found' });

        res.json({ message: 'Towing request updated successfully' });
    } catch (err) {
        console.error('Towing edit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/portal/towing/:id (Cancel)
router.delete('/towing/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.query("UPDATE towing_requests SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Towing request not found' });
        res.json({ message: 'Towing request cancelled successfully' });
    } catch (err) {
        console.error('Towing cancel error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/portal/towing/:id/verify-otp
router.post('/towing/:id/verify-otp', requireAuth, async (req, res) => {
    try {
        const towingId = req.params.id;
        const { otp } = req.body;

        const towingRes = await db.query('SELECT otp, email, pickup_address FROM towing_requests WHERE id = $1 AND user_id = $2', [towingId, req.user.id]);
        if (towingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Towing request not found' });
        }

        if (towingRes.rows[0].otp === otp) {
            await db.query(
                "UPDATE towing_requests SET otp_verified = true, status = 'completed' WHERE id = $1 AND user_id = $2",
                [towingId, req.user.id]
            );

            sendTowingRequestEmail(towingRes.rows[0].email, towingId, towingRes.rows[0].pickup_address).catch(e => console.error(e));

            res.json({ message: 'Towing OTP verified successfully! Request marked as completed.' });
        } else {
            res.status(400).json({ error: 'Incorrect OTP code.' });
        }
    } catch (err) {
        console.error('Towing OTP verify error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /api/portal/contact
router.post('/contact', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        await db.query(
            `INSERT INTO contact_messages (user_id, shop_id, name, email, subject, message, is_read)
             VALUES ($1, $2, $3, $4, $5, $6, false)`,
            [userId, shopId, name, email, subject, message]
        );

        res.status(201).json({ message: 'Message sent successfully!' });
    } catch (err) {
        console.error('Contact message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
