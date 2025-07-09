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

// NEW: POST route to process a simulated donation and save it to DB
router.post('/process-donation', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const userId = req.session.userId; // Get userId from session

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid donation amount.' });
    }

    try {
        const newDonation = new Donation({
            userId: userId,
            amount: parseFloat(amount),
            currency: 'inr', // Default to INR as per your model
            status: 'succeeded', // Always 'succeeded' for simulated payments
            stripePaymentIntentId: `simulated_pi_${Date.now()}_${userId.substring(0, 5)}` // Generate a dummy ID
        });

        await newDonation.save();
        console.log(`Simulated donation saved to DB: User ${userId}, Amount ${amount}`);

        // Update user's points for gamification (optional, but good for engagement)
        const user = await User.findById(userId);
        if (user) {
            user.points = (user.points || 0) + Math.floor(parseFloat(amount) / 10); // Example: 1 point per 10 INR donated
            // You could also ac a badge for first donation, or cumulative donation amounts
            await user.save();
            req.session.user = user; // Update session with new points
        }

        res.status(200).json({ message: 'Simulated donation recorded successfully!', donation: newDonation });
    } catch (error) {
        console.error('Error saving simulated donation:', error);
        res.status(500).json({ error: 'Failed to record simulated donation. Please try again later.' });
    }
});


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
        
        // REMOVED: Injecting dummy data here. Now it will only show real data from DB.
        // If you still want dummy data when DB is empty, you can re-add the logic.
        // For now, it will show an empty table if no real donations are saved.

        res.render('donation_history', { user: user, donations: donations });
    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).send('Server Error fetching donation history.');
    }
});

module.exports = router;
