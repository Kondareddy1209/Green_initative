// routes/admin.js

const express = require('express');
const router = express.Router(); // Correctly initialize router
const User = require('../models/user'); // Import User model
const { isAuthenticated, hasRole } = require('../utils/middleware'); // Import middleware

// New route: Handles GET requests to /admin/ (the base admin URL)
// It redirects to /admin/dashboard
router.get('/', isAuthenticated, hasRole('admin'), (req, res) => {
    res.redirect('/admin/dashboard');
});


// Admin Dashboard - Accessible only by admins
router.get('/dashboard', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const recentSignups = await User.find({}).sort({ createdAt: -1 }).limit(5).lean();

        res.render('admin_dashboard', {
            user: req.session.user,
            totalUsers,
            adminUsers,
            recentSignups
        });
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        // You might want to redirect to admin login if there's a severe error or permission issue
        req.flash('error_msg', 'Failed to load admin dashboard.'); // Assuming flash messages are set up
        res.redirect('/admin/login');
    }
});

// View All Users - Accessible only by admins
router.get('/users', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();
        res.render('admin_users', {
            user: req.session.user,
            allUsers: users,
            message: req.query.message || req.flash('success_msg'), // Use flash messages here too
            error: req.query.error || req.flash('error_msg')
        });
    } catch (error) {
        console.error("Error loading admin users page:", error);
        req.flash('error_msg', 'Failed to load user list.');
        res.redirect('/admin/dashboard'); // Redirect back to dashboard on error
    }
});

// POST to update user role
router.post('/users/update-role/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!['user', 'admin'].includes(newRole)) {
        req.flash('error_msg', 'Invalid role specified.');
        return res.redirect('/admin/users');
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { role: newRole } },
            { new: true }
        );

        if (!updatedUser) {
            req.flash('error_msg', 'User not found for role update.');
            return res.redirect('/admin/users');
        }
        req.flash('success_msg', `Role for ${updatedUser.email} updated to ${newRole}.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error(`Error updating role for user ${id}:`, error);
        req.flash('error_msg', 'Failed to update user role.');
        res.redirect('/admin/users');
    }
});

// POST to delete a user
router.post('/users/delete/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        if (req.session.userId.toString() === id.toString()) {
            req.flash('error_msg', 'Cannot delete your own admin account.');
            return res.redirect('/admin/users');
        }

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            req.flash('error_msg', 'User not found for deletion.');
            return res.redirect('/admin/users');
        }
        req.flash('success_msg', `User ${deletedUser.email} deleted successfully.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        req.flash('error_msg', 'Failed to delete user.');
        res.redirect('/admin/users');
    }
});

module.exports = router;