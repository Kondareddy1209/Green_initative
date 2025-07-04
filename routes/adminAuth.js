// routes/adminAuth.js - Admin Authentication Routes
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { isAuthenticated } = require('../utils/middleware'); // Import isAuthenticated if you need to redirect from login if already logged in.

// GET admin login page (accessible at /admin/login)
router.get('/', (req, res) => {
    // If an admin is already logged in, redirect them to admin dashboard
    if (req.session.userId && req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    // If a regular user is logged in, perhaps redirect them too
    if (req.session.userId && req.session.user && req.session.user.role === 'user') {
        return res.redirect('/dashboard/home'); // Or just show the admin login page
    }

    res.render('admin_login', { error: req.query.error || null });
});

// POST admin login
router.post('/', async (req, res) => {
    const { username, password } = req.body; // 'username' from form is email
    try {
        // Find user by email and ensure their role is 'admin'
        const user = await User.findOne({ email: username, role: 'admin' });
        if (!user) {
            console.log(`Admin login failed: Admin user not found or not assigned admin role for email ${username}`);
            return res.render('admin_login', { error: 'Invalid admin credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (isMatch) {
            req.session.userId = user._id;
            req.session.user = user; // Store full user object including role in session
            console.log(`Admin login successful for user ${username}`);
            return res.redirect('/admin'); // Redirect to admin dashboard
        } else {
            console.log(`Admin login failed: Password mismatch for admin user ${username}`);
            return res.render('admin_login', { error: 'Invalid admin credentials.' });
        }
    } catch (error) {
        console.error("Admin login error:", error);
        res.render('admin_login', { error: 'An error occurred during admin login. Please try again later.' });
    }
});

module.exports = router;