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
        const User = require('../models/user'); // Import User model here to avoid circular dependency

        User.findById(req.session.userId)
            .then(user => {
                if (!user) {
                    req.session.destroy();
                    return res.redirect('/auth');
                }

                if (user.role === roleRequired) {
                    // Update session user role in case it was changed (for navbar/display)
                    if (req.session.user) {
                         req.session.user.role = user.role;
                    }
                    return next();
                } else {
                    // User does not have the required role
                    console.warn(`Access denied: User ${user.email} (Role: ${user.role}) tried to access ${req.originalUrl} which requires role ${roleRequired}`);
                    return res.status(403).send('Access Denied: You do not have permission to view this page.');
                }
            })
            .catch(err => {
                console.error("Error checking user role:", err);
                res.status(500).send('Server Error during authorization check.');
            });
    };
};

module.exports = {
    isAuthenticated,
    hasRole
};