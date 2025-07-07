// routes/donations.js

const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation'); // Import Donation model
const User = require('../models/user'); // Import User model (to link donations)
const { isAuthenticated } = require('../utils/middleware'); // Auth middleware

// Middleware to use isAuthenticated for all donation routes
router.use(isAuthenticated);

// GET route to display the donation form page (http://localhost:3000/donations/donate)
router.get('/donate', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth'); // Redirect to login if user somehow not found
        }
        res.render('donate', { user: user }); // Pass the user object to the EJS template
    } catch (error) {
        console.error('Error loading donate page:', error);
        res.status(500).send('Server Error loading donation page.');
    }
});

// REMOVED: POST route to process a simulated donation (formerly /process-donation)
// There will be no backend processing for "donations" on the POST request now.
// The frontend will be purely static.

// GET route to display donation history (http://localhost:3000/donations/history)
router.get('/history', async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).lean(); // Fetch user for navbar
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        const donations = await Donation.find({ userId: userId }).sort({ transactionDate: -1 }).lean();
        
        // If no donations in DB, inject dummy data for showcase
        if (donations.length === 0) {
            donations.push({
                _id: 'dummy1',
                amount: 500,
                currency: 'inr',
                status: 'succeeded',
                transactionDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Last month
                stripePaymentIntentId: 'dummy_pi_123_showcase'
            }, {
                _id: 'dummy2',
                amount: 1000,
                currency: 'inr',
                status: 'succeeded',
                transactionDate: new Date(),
                stripePaymentIntentId: 'dummy_pi_456_showcase'
            });
        }

        res.render('donation_history', { user: user, donations: donations });
    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).send('Server Error fetching donation history.');
    }
});

module.exports = router;