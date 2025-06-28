// models/otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});

module.exports = mongoose.model('Otp', otpSchema);
