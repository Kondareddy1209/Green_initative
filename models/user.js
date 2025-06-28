const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
 otp: Number

});
module.exports = mongoose.model('User', schema);
