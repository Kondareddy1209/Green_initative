const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/Otp');
const sendOTPEmail = require('../utils/mailer');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.get('/', (req, res) => res.render('login'));

router.post('/login', async (req, res) => {
  const user = await User.findOne(req.body);
  if (user) {
    req.session.userId = user._id;
    return res.redirect('/dashboard');
  }
  res.send('❌ Invalid credentials. <a href="/">Try again</a>');
});

router.get('/signup', (req, res) => res.render('signup'));

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (await User.findOne({ username })) {
    return res.send("❌ Username already exists");
  }
  const otpCode = generateOTP();
  await Otp.deleteMany({ username });
  await Otp.create({ username, otp: otpCode });
  req.session.pendingUser = { username, password };

  await sendOTPEmail(username, otpCode);
  console.log(`✅ OTP sent to ${username}: ${otpCode}`);

  res.render('verify_otp', { username });
});

router.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;
  const otpRecord = await Otp.findOne({ username, otp });
  if (!otpRecord) return res.send("❌ Invalid or expired OTP.");

  const pending = req.session.pendingUser;
  if (!pending || pending.username !== username) {
    return res.send("❌ Session expired");
  }

  await new User(pending).save();
  await Otp.deleteOne({ _id: otpRecord._id });
  delete req.session.pendingUser;

  res.send("✅ Signup successful! <a href='/'>Login here</a>");
});

module.exports = router;
