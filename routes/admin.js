// routes/admin.js

const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Import User model
const { isAuthenticated, hasRole } = require('../utils/middleware'); // Import new middleware

// Admin Dashboard - Accessible only by admins
router.get('/', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        // Fetch some basic stats for the admin dashboard
        const totalUsers = await User.countDocuments({});
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const recentSignups = await User.find({}).sort({ createdAt: -1 }).limit(5).lean();

        res.render('admin_dashboard', {
            user: req.session.user, // Current admin user for navbar
            totalUsers,
            adminUsers,
            recentSignups
        });
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        res.status(500).send("Server Error loading admin dashboard.");
    }
});

// View All Users - Accessible only by admins
router.get('/users', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean(); // Fetch all users
        res.render('admin_users', {
            user: req.session.user, // Current admin user for navbar
            allUsers: users,
            message: req.query.message || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error("Error loading admin users page:", error);
        res.status(500).send("Server Error loading user list.");
    }
});

// POST to update user role (e.g., changing 'user' to 'admin' or vice-versa)
router.post('/users/update-role/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!['user', 'admin'].includes(newRole)) {
        return res.redirect(`/admin/users?error=${encodeURIComponent('Invalid role specified.')}`);
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { role: newRole } },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.redirect(`/admin/users?error=${encodeURIComponent('User not found for role update.')}`);
        }
        res.redirect(`/admin/users?message=${encodeURIComponent(`Role for ${updatedUser.email} updated to ${newRole}.`)}`);
    } catch (error) {
        console.error(`Error updating role for user ${id}:`, error);
        res.redirect(`/admin/users?error=${encodeURIComponent('Failed to update user role.')}`);
    }
});

// POST to delete a user
router.post('/users/delete/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting yourself if you're the current admin
        if (req.session.userId.toString() === id.toString()) {
            return res.redirect(`/admin/users?error=${encodeURIComponent('Cannot delete your own admin account.')}`);
        }

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.redirect(`/admin/users?error=${encodeURIComponent('User not found for deletion.')}`);
        }
        res.redirect(`/admin/users?message=${encodeURIComponent(`User ${deletedUser.email} deleted successfully.`)}`);
    } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        res.redirect(`/admin/users?error=${encodeURIComponent('Failed to delete user.')}`);
    }
});


module.exports = router;