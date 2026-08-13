const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireStaff } = require('../middleware/auth');

// Helper to get shop profile for staff user
async function getShopProfile(userId) {
    const res = await db.query('SELECT * FROM admin_profiles WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
}

// GET /api/shop/dashboard
router.get('/dashboard', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        if (!shop) {
            return res.status(404).json({ error: 'Shop profile not found for staff user' });
        }

        const bookingsRes = await db.query('SELECT * FROM service_bookings WHERE shop_id = $1 ORDER BY id DESC', [shop.id]);
        const towingRes = await db.query('SELECT * FROM towing_requests WHERE shop_id = $1 ORDER BY id DESC', [shop.id]);

        const bookings = bookingsRes.rows;
        const towing = towingRes.rows;

        const stats = {
            total_service: bookings.length,
            total_towing: towing.length,
            total_customer: bookings.length + towing.length,
            pending_order: bookings.filter(b => b.status === 'pending').length + towing.filter(t => t.status === 'pending').length,
            recent_bookings: bookings.slice(0, 5),
            recent_towing: towing.slice(0, 5),
        };

        res.json({ shop, stats });
    } catch (err) {
        console.error('Shop dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/shop/profile
router.get('/profile', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        if (!shop) {
            return res.status(404).json({ error: 'Shop profile not found' });
        }

        const servicesRes = await db.query('SELECT * FROM service_offerings WHERE shop_id = $1 ORDER BY id DESC', [shop.id]);

        res.json({
            shop,
            services: servicesRes.rows,
        });
    } catch (err) {
        console.error('Shop profile get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/shop/profile
router.put('/profile', requireStaff, async (req, res) => {
    try {
        const { full_name, shop_name, phone_number, city, shop_address } = req.body;
        const shop = await getShopProfile(req.user.id);

        if (shop) {
            await db.query(
                `UPDATE admin_profiles
                 SET full_name = $1, shop_name = $2, phone_number = $3, city = $4, shop_address = $5
                 WHERE id = $6`,
                [full_name || '', shop_name, phone_number || '', city || '', shop_address || '', shop.id]
            );
        } else {
            await db.query(
                `INSERT INTO admin_profiles (user_id, full_name, shop_name, phone_number, city, shop_address)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.user.id, full_name || '', shop_name, phone_number || '', city || '', shop_address || '']
            );
        }

        res.json({ message: 'Shop profile updated successfully' });
    } catch (err) {
        console.error('Shop profile update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Service Offerings CRUD
router.post('/services', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        const { title, description, icon_class, price_starts_at, is_active } = req.body;

        if (!title || !description || !price_starts_at) {
            return res.status(400).json({ error: 'Title, description, and price are required' });
        }

        const newService = await db.query(
            `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.id, shop.id, title, description, icon_class || 'fas fa-wrench', price_starts_at, is_active !== false]
        );

        res.status(201).json({ message: 'Service offering added', service: newService.rows[0] });
    } catch (err) {
        console.error('Shop service add error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/services/:id', requireStaff, async (req, res) => {
    try {
        const { title, description, icon_class, price_starts_at, is_active } = req.body;
        await db.query(
            `UPDATE service_offerings
             SET title = $1, description = $2, icon_class = $3, price_starts_at = $4, is_active = $5
             WHERE id = $6`,
            [title, description, icon_class || 'fas fa-wrench', price_starts_at, is_active, req.params.id]
        );

        res.json({ message: 'Service offering updated successfully' });
    } catch (err) {
        console.error('Shop service edit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/services/:id', requireStaff, async (req, res) => {
    try {
        await db.query('DELETE FROM service_offerings WHERE id = $1', [req.params.id]);
        res.json({ message: 'Service offering deleted successfully' });
    } catch (err) {
        console.error('Shop service delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Service Orders Management
router.get('/service-orders', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        const bookingsRes = await db.query(
            `SELECT sb.*,
                    COALESCE(json_agg(json_build_object('id', so.id, 'title', so.title, 'price_starts_at', so.price_starts_at)) FILTER (WHERE so.id IS NOT NULL), '[]') as services
             FROM service_bookings sb
             LEFT JOIN service_booking_items sbi ON sb.id = sbi.booking_id
             LEFT JOIN service_offerings so ON sbi.service_id = so.id
             WHERE sb.shop_id = $1
             GROUP BY sb.id
             ORDER BY sb.id DESC`,
            [shop.id]
        );

        const bookings = bookingsRes.rows;
        const counts = {
            total: bookings.length,
            pending: bookings.filter(b => b.status === 'pending').length,
            processing: bookings.filter(b => b.status === 'processing').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
        };

        res.json({ bookings, counts });
    } catch (err) {
        console.error('Shop service orders get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/service-orders/:id', requireStaff, async (req, res) => {
    try {
        const { status, customer_name, customer_phone, customer_email, vehicle_info, is_paid } = req.body;
        
        const currentRes = await db.query('SELECT * FROM service_bookings WHERE id = $1', [req.params.id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        const current = currentRes.rows[0];

        await db.query(
            `UPDATE service_bookings
             SET status = $1, customer_name = $2, customer_phone = $3, customer_email = $4, vehicle_info = $5, is_paid = $6
             WHERE id = $7`,
            [
                status !== undefined ? status : current.status,
                customer_name !== undefined ? customer_name : current.customer_name,
                customer_phone !== undefined ? customer_phone : current.customer_phone,
                customer_email !== undefined ? customer_email : current.customer_email,
                vehicle_info !== undefined ? vehicle_info : current.vehicle_info,
                is_paid !== undefined ? is_paid : current.is_paid,
                req.params.id
            ]
        );

        res.json({ message: 'Service order updated successfully' });
    } catch (err) {
        console.error('Shop service order update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Towing Orders Management
router.get('/towing-orders', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        const towingRes = await db.query('SELECT * FROM towing_requests WHERE shop_id = $1 ORDER BY id DESC', [shop.id]);

        const towing = towingRes.rows;
        const counts = {
            total: towing.length,
            pending: towing.filter(t => t.status === 'pending').length,
            processing: towing.filter(t => t.status === 'processing').length,
            completed: towing.filter(t => t.status === 'completed').length,
            cancelled: towing.filter(t => t.status === 'cancelled').length,
        };

        res.json({ towing, counts });
    } catch (err) {
        console.error('Shop towing orders get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/towing-orders/:id', requireStaff, async (req, res) => {
    try {
        const { status, full_name, phone_number, vehicle_details, pickup_address } = req.body;
        await db.query(
            `UPDATE towing_requests
             SET status = $1, full_name = $2, phone_number = $3, vehicle_details = $4, pickup_address = $5
             WHERE id = $6`,
            [status, full_name, phone_number, vehicle_details, pickup_address, req.params.id]
        );

        res.json({ message: 'Towing order updated successfully' });
    } catch (err) {
        console.error('Shop towing order update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer Messages Management
router.get('/messages', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        const messagesRes = await db.query('SELECT * FROM contact_messages WHERE shop_id = $1 ORDER BY id DESC', [shop.id]);

        const messages = messagesRes.rows;
        const total = messages.length;
        const readCount = messages.filter(m => m.is_read).length;
        const unreadCount = total - readCount;
        const readPercentage = total > 0 ? Math.round((readCount / total) * 100) : 0;

        res.json({
            messages,
            stats: {
                total_message: total,
                read_message: readCount,
                not_read_message: unreadCount,
                read_percentage: readPercentage,
            },
        });
    } catch (err) {
        console.error('Shop messages get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/messages/:id', requireStaff, async (req, res) => {
    try {
        await db.query('UPDATE contact_messages SET is_read = true WHERE id = $1', [req.params.id]);
        const messageRes = await db.query('SELECT * FROM contact_messages WHERE id = $1', [req.params.id]);

        res.json({ message: messageRes.rows[0] });
    } catch (err) {
        console.error('Shop message detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/messages/:id', requireStaff, async (req, res) => {
    try {
        const { is_read } = req.body;
        await db.query('UPDATE contact_messages SET is_read = $1 WHERE id = $2', [is_read, req.params.id]);
        res.json({ message: 'Message read status updated' });
    } catch (err) {
        console.error('Shop message update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
