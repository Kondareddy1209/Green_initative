require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/otp');
const sendOTPEmail = require('../utils/mailer');

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET: Login page
router.get('/', (req, res) => {
  res.render('login');
});

// POST: Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (user) {
    req.session.userId = user._id;
    return res.redirect('/dashboard/home');
  }

  res.send('❌ Invalid credentials. <a href="/">Try again</a>');
});

// GET: Signup form
router.get('/signup', (req, res) => {
  res.render('signup');
});

// POST: Signup → Generate OTP and store pending user in session
router.post('/signup', async (req, res) => {
  const { username, password, mobile, firstName, lastName } = req.body;

  if (await User.findOne({ username })) {
    return res.send('❌ Email already exists. <a href="/">Login here</a>');
  }

  const otpCode = generateOTP();

  // Remove any existing OTPs for this user
  await Otp.deleteMany({ username });
  await Otp.create({ username, otp: otpCode });

  // Store pending user data temporarily in session
  req.session.pendingUser = {
    username,
    password,
    mobile,
    firstName,
    lastName
  };

  await sendOTPEmail(username, otpCode);
  console.log(`✅ OTP ${otpCode} sent to ${username}`);

  res.render('verify_otp', { username });
});

// POST: Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;

  const otpEntry = await Otp.findOne({ username, otp });

  if (!otpEntry) {
    return res.send('❌ Invalid or expired OTP. <a href="/signup">Try again</a>');
  }

  const pending = req.session.pendingUser;

  if (!pending || pending.username !== username) {
    return res.send('❌ Session expired. <a href="/signup">Start again</a>');
  }

  // Create user account
  await User.create({
    username: pending.username,
    password: pending.password,
    mobile: pending.mobile,
    firstName: pending.firstName,
    lastName: pending.lastName
  });

  await Otp.deleteOne({ _id: otpEntry._id });
  delete req.session.pendingUser;

  res.send('✅ Signup successful! <a href="/">Login here</a>');
});

module.exports = router;
