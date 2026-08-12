const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/client/dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const bookingsRes = await db.query(
            `SELECT sb.*, ap.shop_name FROM service_bookings sb
             LEFT JOIN admin_profiles ap ON sb.shop_id = ap.id
             WHERE sb.user_id = $1 ORDER BY sb.id DESC`,
            [userId]
        );

        const towingRes = await db.query(
            `SELECT tr.*, ap.shop_name FROM towing_requests tr
             LEFT JOIN admin_profiles ap ON tr.shop_id = ap.id
             WHERE tr.user_id = $1 ORDER BY tr.id DESC`,
            [userId]
        );

        const bookings = bookingsRes.rows;
        const towing = towingRes.rows;

        const stats = {
            total_orders: bookings.length + towing.length,
            total_service_orders: bookings.length,
            active_service_orders: bookings.filter(b => b.status === 'processing' || b.status === 'confirmed').length,
            total_towing_orders: towing.length,
            active_towing_orders: towing.filter(t => t.status === 'processing' || t.status === 'pending').length,
            recent_service_orders: bookings.slice(0, 3),
            recent_towing_orders: towing.slice(0, 3),
        };

        res.json({ stats });
    } catch (err) {
        console.error('Client dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/client/profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const userRes = await db.query(
            'SELECT id, username, email, first_name, last_name FROM users WHERE id = $1',
            [userId]
        );

        const shopsRes = await db.query('SELECT * FROM admin_profiles ORDER BY shop_name ASC');

        const selectedRes = await db.query(
            'SELECT select_shop_id FROM select_shops WHERE user_id = $1',
            [userId]
        );

        const selectedShopId = selectedRes.rows.length > 0 ? selectedRes.rows[0].select_shop_id : null;

        res.json({
            user: userRes.rows[0],
            shops: shopsRes.rows,
            selected_shop_id: selectedShopId,
        });
    } catch (err) {
        console.error('Client profile get error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/client/profile
router.post('/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, email } = req.body;

        await db.query(
            'UPDATE users SET first_name = $1, last_name = $2, email = $3 WHERE id = $4',
            [first_name || '', last_name || '', email, userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Client profile update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/client/select-shop
router.post('/select-shop', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { select_shop_id } = req.body;

        if (!select_shop_id) {
            return res.status(400).json({ error: 'Shop ID is required' });
        }

        const existing = await db.query('SELECT id FROM select_shops WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) {
            await db.query('UPDATE select_shops SET select_shop_id = $1 WHERE user_id = $2', [select_shop_id, userId]);
        } else {
            await db.query('INSERT INTO select_shops (user_id, select_shop_id) VALUES ($1, $2)', [userId, select_shop_id]);
        }

        res.json({ message: 'Selected shop updated successfully' });
    } catch (err) {
        console.error('Select shop error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/client/service-orders
router.get('/service-orders', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const bookingsRes = await db.query(
            `SELECT sb.*, ap.shop_name,
                    COALESCE(json_agg(json_build_object('id', so.id, 'title', so.title, 'price_starts_at', so.price_starts_at)) FILTER (WHERE so.id IS NOT NULL), '[]') as services
             FROM service_bookings sb
             LEFT JOIN admin_profiles ap ON sb.shop_id = ap.id
             LEFT JOIN service_booking_items sbi ON sb.id = sbi.booking_id
             LEFT JOIN service_offerings so ON sbi.service_id = so.id
             WHERE sb.user_id = $1
             GROUP BY sb.id, ap.shop_name
             ORDER BY sb.id DESC`,
            [userId]
        );

        const bookings = bookingsRes.rows;

        const counts = {
            pending: bookings.filter(b => b.status === 'pending').length,
            confirmed: bookings.filter(b => b.status === 'confirmed').length,
            processing: bookings.filter(b => b.status === 'processing').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
        };

        res.json({ bookings, counts });
    } catch (err) {
        console.error('Client service orders error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/client/towing-orders
router.get('/towing-orders', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const towingRes = await db.query(
            `SELECT tr.*, ap.shop_name FROM towing_requests tr
             LEFT JOIN admin_profiles ap ON tr.shop_id = ap.id
             WHERE tr.user_id = $1 ORDER BY tr.id DESC`,
            [userId]
        );

        const towing = towingRes.rows;

        const counts = {
            pending: towing.filter(t => t.status === 'pending').length,
            processing: towing.filter(t => t.status === 'processing').length,
            completed: towing.filter(t => t.status === 'completed').length,
            cancelled: towing.filter(t => t.status === 'cancelled').length,
        };

        res.json({ towing, counts });
    } catch (err) {
        console.error('Client towing orders error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
