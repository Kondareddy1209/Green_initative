// utils/middleware.js

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    req.session.returnTo = req.originalUrl; // Store the URL they were trying to access
    res.redirect('/auth'); // Redirect to login
};

// Middleware to check if user has a specific role
const hasRole = (roleRequired) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            // If not authenticated, redirect to login
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth');
        }

        // Fetch the user from the database to get their current role
        // (Session 'user' object might be outdated if role was just changed)
        // Or, if you keep req.session.user fully updated on every action,
        // you can rely on req.session.user.role directly.
        // For robustness, let's re-fetch from DB.
        const User = require('../models/user'); // Import User model here to avoid circular dependency

        User.findById(req.session.userId)
            .then(user => {
                if (!user) {
                    req.session.destroy();
                    return res.redirect('/auth');
                }

                if (user.role === roleRequired) {
                    // Update session user role in case it was changed
                    req.session.user.role = user.role;
                    return next();
                } else {
                    // User does not have the required role
                    console.warn(`Access denied: User ${user.email} (Role: ${user.role}) tried to access ${req.originalUrl} which requires role ${roleRequired}`);
                    return res.status(403).send('Access Denied: You do not have permission to view this page.');
                    // Alternatively, redirect to a different page or show a custom error page
                    // return res.redirect('/dashboard?error=' + encodeURIComponent('Access Denied: Not authorized.'));
                }
            })
            .catch(err => {
                console.error("Error checking user role:", err);
                res.status(500).send('Server Error during authorization check.');
            });
    };
};

// Export individual middleware functions or an object
module.exports = {
    isAuthenticated,
    hasRole
};