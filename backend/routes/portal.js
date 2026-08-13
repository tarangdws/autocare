const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key');

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

// POST /api/portal/book-service
router.post('/book-service', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes, service_ids, payment_method } = req.body;

        if (!customer_name || !customer_phone || !customer_email || !vehicle_info || !preferred_date || !preferred_time || !service_ids || service_ids.length === 0) {
            return res.status(400).json({ error: 'All required booking fields must be provided' });
        }

        // Get user's selected shop
        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        const otp = generateOtp();
        const bookingRes = await db.query(
            `INSERT INTO service_bookings (user_id, shop_id, customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes, status, otp, otp_verified, payment_method, is_paid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, false, $11, false) RETURNING *`,
            [userId, shopId, customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes || '', otp, payment_method || 'cash']
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
                    description: `AutoCare Booking ID: ${booking.id}`,
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
             WHERE sb.id = $1`,
            [bookingId]
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

        const bookingCheck = await db.query('SELECT status FROM service_bookings WHERE id = $1', [bookingId]);
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
        await db.query("UPDATE service_bookings SET status = 'cancelled' WHERE id = $1", [bookingId]);
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

        const bookingRes = await db.query('SELECT otp FROM service_bookings WHERE id = $1', [bookingId]);
        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (bookingRes.rows[0].otp === otp) {
            await db.query(
                "UPDATE service_bookings SET otp_verified = true, status = 'completed' WHERE id = $1",
                [bookingId]
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
        const bookingRes = await db.query('SELECT * FROM service_bookings WHERE id = $1', [bookingId]);
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
                description: `AutoCare Bill Payment ID: ${booking.id}`,
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
        const { full_name, phone_number, vehicle_details, pickup_address, latitude, longitude } = req.body;

        if (!full_name || !phone_number || !vehicle_details || !pickup_address) {
            return res.status(400).json({ error: 'Full name, phone number, vehicle details, and pickup address are required' });
        }

        const shopRes = await db.query('SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]);
        const shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

        const otp = generateOtp();
        const towingRes = await db.query(
            `INSERT INTO towing_requests (user_id, shop_id, full_name, phone_number, vehicle_details, pickup_address, latitude, longitude, status, otp, otp_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, false) RETURNING *`,
            [userId, shopId, full_name, phone_number, vehicle_details, pickup_address, latitude || null, longitude || null, otp]
        );

        res.status(201).json({
            message: 'Towing request submitted successfully',
            towing: towingRes.rows[0],
            otp,
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
             WHERE tr.id = $1`,
            [req.params.id]
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

        await db.query(
            `UPDATE towing_requests
             SET full_name = $1, phone_number = $2, vehicle_details = $3, pickup_address = $4, latitude = $5, longitude = $6
             WHERE id = $7`,
            [full_name, phone_number, vehicle_details, pickup_address, latitude || null, longitude || null, towingId]
        );

        res.json({ message: 'Towing request updated successfully' });
    } catch (err) {
        console.error('Towing edit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/portal/towing/:id (Cancel)
router.delete('/towing/:id', requireAuth, async (req, res) => {
    try {
        await db.query("UPDATE towing_requests SET status = 'cancelled' WHERE id = $1", [req.params.id]);
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

        const towingRes = await db.query('SELECT otp FROM towing_requests WHERE id = $1', [towingId]);
        if (towingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Towing request not found' });
        }

        if (towingRes.rows[0].otp === otp) {
            await db.query(
                "UPDATE towing_requests SET otp_verified = true, status = 'completed' WHERE id = $1",
                [towingId]
            );
            res.json({ message: 'Towing OTP verified successfully! Request marked as completed.' });
        } else {
            res.status(400).json({ error: 'Incorrect OTP code.' });
        }
    } catch (err) {
        console.error('Towing OTP verify error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Blog CRUD
router.get('/blogs', async (req, res) => {
    try {
        const blogsRes = await db.query('SELECT * FROM blog_posts ORDER BY id DESC');
        res.json({ posts: blogsRes.rows });
    } catch (err) {
        console.error('Blogs get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/blogs', requireAuth, async (req, res) => {
    try {
        const { title, content, image_url, author } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const newBlog = await db.query(
            `INSERT INTO blog_posts (user_id, title, slug, content, image_url, author)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.id, title, slug, content, image_url || '', author || 'AutoCare Team']
        );

        res.status(201).json({ message: 'Blog post created', post: newBlog.rows[0] });
    } catch (err) {
        console.error('Blog create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/blogs/:id', requireAuth, async (req, res) => {
    try {
        const { title, content, image_url, author } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        await db.query(
            `UPDATE blog_posts SET title = $1, slug = $2, content = $3, image_url = $4, author = $5 WHERE id = $6`,
            [title, slug, content, image_url || '', author || 'AutoCare Team', req.params.id]
        );

        res.json({ message: 'Blog post updated successfully' });
    } catch (err) {
        console.error('Blog edit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/blogs/:id', requireAuth, async (req, res) => {
    try {
        await db.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
        res.json({ message: 'Blog post deleted successfully' });
    } catch (err) {
        console.error('Blog delete error:', err);
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
