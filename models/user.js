const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  otp: { type: Number, default: null },

});
module.exports = mongoose.model('User', schema);
