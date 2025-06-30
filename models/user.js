// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: String,
  mobile: String,
  lastResult: {
    totalConsumption: Number,
    carbonKg: Number,
    totalAmount: Number,
    energyUsage: [
      {
        value: {
          consumption: Number,
          unitPrice: Number
        }
      }
    ],
    savingsTip: String
  }
});

module.exports = mongoose.model('User', userSchema);
