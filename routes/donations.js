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
        res.render('donate', { user: user, message: req.query.message || null, error: req.query.error || null }); // Pass messages
    } catch (error) {
        console.error('Error loading donate page:', error);
        res.status(500).send('Server Error loading donation page.');
    }
});

// POST route to process a simulated donation
router.post('/process-donation', async (req, res) => {
    const { amount } = req.body; // Amount from client
    const userId = req.session.userId; // Get user ID from session

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Donation amount is required and must be positive.' });
    }
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Authenticated user not found.' });
        }

        // For showcase: Directly record the donation as successful
        const newDonation = new Donation({
            userId: userId,
            amount: parseFloat(amount),
            currency: 'inr', // Default currency for showcase
            stripePaymentIntentId: `sim_pi_${Date.now()}_${userId.toString().substring(0, 5)}`, // Unique ID for simulation
            status: 'succeeded', // Always succeeded for showcase
            transactionDate: new Date()
        });
        await newDonation.save();

        console.log(`Showcase Donation: User ${user.email} simulated donation of ₹${amount}`);
        res.json({ success: true, message: 'Simulated donation recorded successfully!' });
    } catch (error) {
        console.error('Error processing simulated donation:', error);
        res.status(500).json({ error: 'Failed to record simulated donation.' });
    }
});

// GET route to display donation history
router.get('/history', async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).lean(); // Fetch user for navbar
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        const donations = await Donation.find({ userId: userId }).sort({ transactionDate: -1 }).lean();
        
        // No longer injecting dummy data here if you're saving real simulated ones
        // If you still want dummy data for *all* users, regardless of real saves,
        // you would uncomment and modify this block. For now, it shows what's in DB.
        /*
        if (donations.length === 0) {
            donations.push({
                _id: 'dummy1', amount: 500, currency: 'inr', status: 'succeeded',
                transactionDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                stripePaymentIntentId: 'dummy_pi_123_showcase'
            }, {
                _id: 'dummy2', amount: 100, currency: 'inr', status: 'succeeded',
                transactionDate: new Date(),
                stripePaymentIntentId: 'dummy_pi_456_showcase'
            });
        }
        */

        res.render('donation_history', { user: user, donations: donations });
    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).send('Server Error fetching donation history.');
    }
});

module.exports = router;