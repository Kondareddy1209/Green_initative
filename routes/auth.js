// routes/auth.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/Otp');
const { sendOTPEmail } = require('../utils/mailer');
const bcrypt = require('bcryptjs');

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Middleware to log session for debugging (REMOVE IN PRODUCTION)
router.use((req, res, next) => {
    // console.log('Auth Route: Current Session:', req.session);
    next();
});

// GET login page (now accessible at /auth)
router.get('/', (req, res) => {
    res.render('login', { error: req.query.error || null, message: req.query.message || null });
});

// POST login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ email: username });
        if (!user) {
            console.log(`Login failed: User not found for email ${username}`);
            return res.redirect('/auth?error=' + encodeURIComponent('Invalid email or password.'));
        }
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
            req.session.userId = user._id;
            req.session.user = user;
            console.log(`Login successful for user ${username}`);
            return res.redirect('/dashboard/home');
        } else {
            console.log(`Login failed: Password mismatch for email ${username}`);
            return res.redirect('/auth?error=' + encodeURIComponent('Invalid email or password.'));
        }
    } catch (error) {
        console.error("Login error:", error);
        res.redirect('/auth?error=' + encodeURIComponent('An error occurred during login. Please try again later.'));
    }
});

// GET signup page (now accessible at /auth/signup)
router.get('/signup', (req, res) => {
    res.render('signup', { error: req.query.error || null });
});

// POST signup
router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, mobile, password, gender } = req.body;
    try {
        if (await User.findOne({ email: email })) {
            console.log(`Signup failed: Email already exists ${email}`);
            return res.redirect('/auth/signup?error=' + encodeURIComponent('Email already exists.'));
        }

        const otpCode = generateOTP();
        await Otp.deleteMany({ email: email, type: 'signup' });
        await Otp.create({ email: email, otp: otpCode, type: 'signup' });

        // Store full user data in session for pending verification
        req.session.pendingUser = {
            username: email,
            email,
            password, // This password will be hashed when new User(pending).save() is called
            mobile,
            firstName,
            lastName,
            gender
        };
        console.log(`Signup OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'signup');

        res.render('verify_otp', { username: email, error: null, message: null, isPasswordReset: false });
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect('/auth/signup?error=' + encodeURIComponent('An error occurred during signup. Please try again later.'));
    }
});

// POST verify OTP (for signup and password reset)
router.post('/verify-otp', async (req, res) => {
    const { username, otp, isPasswordReset } = req.body; // 'username' here is the email from the form
    const otpType = isPasswordReset === 'true' ? 'password_reset' : 'signup';

    console.log(`Attempting OTP verification for ${username}, type: ${otpType}, OTP: ${otp}`);

    try {
        const otpRec = await Otp.findOne({ email: username, otp: otp, type: otpType });

        if (!otpRec) {
            console.log(`OTP verification failed: Invalid or expired OTP for ${username}, type ${otpType}`);
            return res.render('verify_otp', { username: username, error: 'Invalid or expired OTP.', message: null, isPasswordReset: isPasswordReset === 'true' });
        }
        console.log(`OTP record found for ${username}, type ${otpType}. ID: ${otpRec._id}`);


        if (otpType === 'signup') {
            const pending = req.session.pendingUser;
            if (!pending || pending.email !== username) {
                console.log(`Signup verification failed: Session pendingUser missing or mismatch for ${username}`);
                return res.redirect('/auth/signup?error=' + encodeURIComponent('Session expired. Please sign up again.'));
            }

            const newUser = new User(pending);
            await newUser.save(); // Password will be hashed by pre-save hook
            console.log(`New user created: ${newUser.email}`);

            await Otp.deleteOne({ _id: otpRec._id });
            delete req.session.pendingUser; // Clear pending user data from session
            console.log(`OTP and pending user session cleared for ${username}`);

            res.redirect('/auth?message=' + encodeURIComponent('Signup successful! Please login.'));
        } else { // It's a password reset OTP
            const resetEmail = req.session.resetEmail;
            if (!resetEmail || resetEmail !== username) {
                console.log(`Password reset verification failed: Session resetEmail missing or mismatch for ${username}`);
                return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Session expired. Please request a new password reset.'));
            }

            // OTP is valid and session is good, proceed to reset password page
            await Otp.deleteOne({ _id: otpRec._id });
            console.log(`OTP deleted for password reset for ${username}. Redirecting to reset password.`);
            res.redirect('/auth/reset-password');
        }
    } catch (error) {
        console.error("OTP verification caught error:", error);
        res.render('verify_otp', { username: username, error: 'An error occurred during verification. Please try again later.', message: null, isPasswordReset: isPasswordReset === 'true' });
    }
});

// --- FORGOT PASSWORD ROUTES ---

// GET Forgot Password page
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { error: req.query.error || null, message: req.query.message || null });
});

// POST Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Forgot password: User not found for email ${email}. Sending generic message.`);
            return res.render('forgot_password', { message: 'If an account with that email exists, an OTP has been sent.', error: null });
        }

        const otpCode = generateOTP();
        await Otp.deleteMany({ email: email, type: 'password_reset' });
        await Otp.create({ email: email, otp: otpCode, type: 'password_reset' });

        req.session.resetEmail = email; // Store email in session for the next step
        console.log(`Forgot password OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'password_reset');

        res.render('verify_otp', { username: email, message: 'OTP sent to your email for password reset.', error: null, isPasswordReset: true });
    } catch (error) {
        console.error("Forgot password OTP send error:", error);
        res.render('forgot_password', { error: 'Failed to send OTP. Please try again later.', message: null });
    }
});

// GET Reset Password page (after OTP is verified)
router.get('/reset-password', (req, res) => {
    if (!req.session.resetEmail) {
        console.log("Reset password GET: No resetEmail in session.");
        return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Session expired. Please request a new password reset.'));
    }
    res.render('reset_password', { email: req.session.resetEmail, error: null });
});

// POST Reset Password - Update password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
    try {
        if (!req.session.resetEmail || req.session.resetEmail !== email) {
            console.log("Reset password POST: resetEmail in session mismatch or missing.");
            return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Session expired. Please request a new password reset.'));
        }
        if (newPassword !== confirmPassword) {
            console.log("Reset password POST: Passwords do not match.");
            return res.render('reset_password', { email: email, error: 'Passwords do not match.' });
        }
        if (newPassword.length < 6) {
            console.log("Reset password POST: Password too short.");
            return res.render('reset_password', { email: email, error: 'Password must be at least 6 characters long.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Reset password POST: User not found for email ${email}`);
            return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('User not found.'));
        }

        user.password = newPassword; // This will trigger the pre-save hook to hash the password
        await user.save();
        console.log(`Password successfully reset for user ${email}`);

        delete req.session.resetEmail; // Clear email from session

        res.redirect('/auth?message=' + encodeURIComponent('Password reset successfully! You can now login.'));

    } catch (error) {
        console.error("Password reset error:", error);
        res.render('reset_password', { email: email, error: 'Failed to reset password. Please try again later.' });
    }
});

module.exports = router;