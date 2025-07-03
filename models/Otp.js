// models/Otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, index: true }, // OTPs are now associated with email
    otp: { type: String, required: true },
    type: { type: String, enum: ['signup', 'password_reset'], default: 'signup' }, // Differentiate OTP usage
    createdAt: { type: Date, default: Date.now, expires: 300 } // expires after 5 minutes (300 seconds)
});

module.exports = mongoose.model('Otp', otpSchema);