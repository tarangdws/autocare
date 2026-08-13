const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
             VALUES ($1, $2, $3, $4, $5, false, false) RETURNING id, username, email, first_name, last_name, is_staff, is_superuser`,
            [username, email, hashedPassword, first_name || '', last_name || '']
        );

        const user = newUser.rows[0];

        // Link user to default shop if shops exist
        const firstShop = await db.query('SELECT id FROM admin_profiles ORDER BY id ASC LIMIT 1');
        if (firstShop.rows.length > 0) {
            await db.query(
                `INSERT INTO select_shops (user_id, select_shop_id) VALUES ($1, $2)`,
                [user.id, firstShop.rows[0].id]
            );
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, is_staff: user.is_staff, is_superuser: user.is_superuser },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Send Welcome Email asynchronously
        sendWelcomeEmail(user.email, user.first_name || user.username);

        res.status(201).json({
            message: 'Registration successful',
            token,
            user,
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const user = userRes.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, is_staff: user.is_staff, is_superuser: user.is_superuser },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_staff: user.is_staff,
            is_superuser: user.is_superuser,
        };

        res.json({
            message: 'Login successful',
            token,
            user: userData,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT id, username, email, first_name, last_name, is_staff, is_superuser FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];
        let profile = null;

        if (user.is_staff) {
            const profileRes = await db.query('SELECT * FROM admin_profiles WHERE user_id = $1', [user.id]);
            profile = profileRes.rows[0] || null;
        } else {
            const shopRes = await db.query(
                `SELECT ap.* FROM select_shops ss
                 JOIN admin_profiles ap ON ss.select_shop_id = ap.id
                 WHERE ss.user_id = $1`,
                [user.id]
            );
            profile = shopRes.rows[0] || null;
        }

        res.json({ user, profile });
    } catch (err) {
        console.error('Auth Me error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/forget-password
router.post('/forget-password', (req, res) => {
    res.json({ message: 'Password reset link sent to your registered email.' });
});

module.exports = router;
