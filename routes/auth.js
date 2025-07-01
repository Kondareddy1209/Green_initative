// routes/auth.js — Fully Updated with Gender and Full Name
require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/otp');
const sendOTPEmail = require('../utils/mailer');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET login
router.get('/', (req, res) => {
  res.render('login');
});

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.userId = user._id;
    return res.redirect('/dashboard/home');
  }
  res.send('❌ Invalid credentials. <a href="/">Try again</a>');
});

// GET signup
router.get('/signup', (req, res) => {
  res.render('signup');
});

// POST signup
router.post('/signup', async (req, res) => {
  const { username, password, mobile, firstName, lastName, gender } = req.body;
  if (await User.findOne({ username })) {
    return res.send('❌ Username already exists');
  }

  const otpCode = generateOTP();
  await Otp.deleteMany({ username });

  req.session.pendingUser = {
    username,
    password,
    mobile,
    firstName,
    lastName,
    gender
  };

  await Otp.create({ username, otp: otpCode });
  await sendOTPEmail(username, otpCode);

  res.render('verify_otp', { username });
});

// POST verify OTP
router.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;
  const otpRec = await Otp.findOne({ username, otp });
  if (!otpRec) {
    return res.send('❌ Invalid or expired OTP. <a href="/signup">Signup again</a>');
  }

  const pending = req.session.pendingUser;
  if (!pending || pending.username !== username) {
    return res.send('❌ Session expired. <a href="/signup">Signup again</a>');
  }

  await new User(pending).save();
  await Otp.deleteOne({ _id: otpRec._id });
  delete req.session.pendingUser;

  res.send('✅ Signup successful! <a href="/">Login here</a>');
});

module.exports = router;
