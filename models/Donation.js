// models/Donation.js

const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    userId: { // Reference to the User who made the donation
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: { // Donation amount
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'inr', // Default to INR
        lowercase: true
    },
    stripePaymentIntentId: { // Make optional for simulated payments
        type: String,
        required: false, // Changed to false
        unique: false // Changed to false, as it might be null or undefined for simulated
    },
    status: { // Payment status (e.g., 'succeeded', 'pending', 'failed' - for showcase, always 'succeeded')
        type: String,
        required: true,
        default: 'succeeded' // For showcase, default to succeeded
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Donation', donationSchema);