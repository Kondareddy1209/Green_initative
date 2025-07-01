const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: String,
  firstName: String,
  lastName: String,
  gender: String,
  lastResult: {
    totalConsumption: Number,
    carbonKg: Number,
    totalAmount: Number,
    energyUsage: [
      {
        month: String,
        consumption: Number
      }
    ],
    savingsTip: String
  }
});

module.exports = mongoose.model('User', userSchema);