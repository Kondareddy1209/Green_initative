// routes/auth.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/Otp');
const { sendOTPEmail } = require('../utils/mailer'); // Use destructuring for specific mailer functions
const bcrypt = require('bcryptjs');
const { initializeNewUserGamification } = require('../utils/gamification'); // NEW IMPORT for gamification

// --- generateOTP function ---
// Ensure this function is defined at the top level of this file
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
// --- End generateOTP function ---


// Middleware to log session for debugging (REMOVE IN PRODUCTION)
// router.use((req, res, next) => {
//     console.log('Auth Route: Current Session:', req.session);
//     next();
// });

// GET regular user login page (accessible at /auth)
router.get('/', (req, res) => {
    res.render('login', { error: req.query.error || null, message: req.query.message || null });
});

// POST regular user login
router.post('/login', async (req, res) => {
    const { username, password } = req.body; // 'username' from login form is expected to be the email
    try {
        // Find user by email and ensure they are NOT an admin for regular login
        const user = await User.findOne({ email: username, role: 'user' }); // Only allow 'user' role to login here
        if (!user) {
            console.log(`Regular user login failed: User not found or is admin for email ${username}`);
            return res.redirect('/auth?error=' + encodeURIComponent('Invalid email or password.'));
        }

        const isMatch = await user.comparePassword(password);
        if (isMatch) {
            req.session.userId = user._id;
            req.session.user = user; // Store full user object in session
            console.log(`Regular user login successful for user ${username}`);
            return res.redirect('/dashboard/home');
        } else {
            console.log(`Regular user login failed: Password mismatch for email ${username}`);
            return res.redirect('/auth?error=' + encodeURIComponent('Invalid email or password.'));
        }
    } catch (error) {
        console.error("Regular user login error:", error);
        res.redirect('/auth?error=' + encodeURIComponent('An error occurred during login. Please try again later.'));
    }
});

// GET signup page (accessible at /auth/signup)
router.get('/signup', (req, res) => {
    res.render('signup', { error: req.query.error || null });
});

// POST signup
router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, mobile, password, gender } = req.body;
    try {
        // Check if email already exists
        if (await User.findOne({ email: email })) {
            console.log(`Signup failed: Email already exists ${email}`);
            return res.redirect('/auth/signup?error=' + encodeURIComponent('Email already exists.'));
        }

        const otpCode = generateOTP(); // Call generateOTP
        // Delete any old signup OTPs for this email, then create a new one
        await Otp.deleteMany({ email: email, type: 'signup' });
        await Otp.create({ email: email, otp: otpCode, type: 'signup' });

        // Initialize gamification data for the new user
        const gamificationData = initializeNewUserGamification(); // NEW

        // Store full user data in session for pending verification
        req.session.pendingUser = {
            username: email, // Store email as username for the new user (for consistency with your current schema)
            email,
            password, // This password will be hashed when new User(pending).save() is called
            mobile,
            firstName,
            lastName,
            gender,
            points: gamificationData.points, // NEW
            badges: gamificationData.badges, // NEW
            achievementsTracker: gamificationData.achievementsTracker, // NEW
            role: 'user' // Explicitly set role as 'user' for new signups
        };
        console.log(`Signup OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'signup');

        // Pass message as null here to avoid "message is not defined" error in verify_otp.ejs
        res.render('verify_otp', { username: email, error: null, message: null, isPasswordReset: false });
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect('/auth/signup?error=' + encodeURIComponent('An error occurred during signup. Please try again later.'));
    }
});

// POST verify OTP (for signup and password reset)
router.post('/verify-otp', async (req, res) => {
    let { username, otp, isPasswordReset } = req.body; // 'username' from form is the email
    otp = otp.trim(); // Trim OTP to prevent whitespace issues
    const otpType = isPasswordReset === 'true' ? 'password_reset' : 'signup';

    console.log(`DEBUG: Attempting OTP verification for ${username}, type: ${otpType}, OTP: '${otp}'`);
    console.log(`DEBUG: isPasswordReset from form: ${isPasswordReset} (Type: ${typeof isPasswordReset})`);

    try {
        const otpRec = await Otp.findOne({ email: username, otp: otp, type: otpType });

        if (!otpRec) {
            console.log(`OTP verification failed: Invalid or expired OTP for ${username}, type ${otpType}`);
            // Ensure message is passed as null for consistency
            return res.render('verify_otp', { username: username, error: 'Invalid or expired OTP.', message: null, isPasswordReset: isPasswordReset === 'true' });
        }
        console.log(`OTP record found for ${username}, type ${otpType}. ID: ${otpRec._id}`);


        if (otpType === 'signup') {
            const pending = req.session.pendingUser;
            if (!pending || pending.email !== username) {
                console.log(`Signup verification failed: Session pendingUser missing or mismatch for ${username}`);
                return res.redirect('/auth/signup?error=' + encodeURIComponent('Session expired. Please sign up again.'));
            }

            const newUser = new User(pending); // 'pending' now includes gamification data
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

            await Otp.deleteOne({ _id: otpRec._id });
            console.log(`OTP deleted for password reset for ${username}. Redirecting to reset password.`);
            res.redirect('/auth/reset-password'); // Redirect to GET reset-password route
        }
    } catch (error) {
        console.error("OTP verification caught error:", error);
        // Ensure message is passed as null for consistency
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
        // Find user by email and ensure they are NOT an admin for password reset
        const user = await User.findOne({ email: email, role: 'user' }); // Only allow 'user' role for reset here
        if (!user) {
            console.log(`Forgot password: User not found or is admin for email ${email}. Sending generic message.`);
            // Send a generic message to prevent email enumeration
            return res.render('forgot_password', { message: 'If an account with that email exists, an OTP has been sent.', error: null });
        }

        const otpCode = generateOTP(); // Call generateOTP
        await Otp.deleteMany({ email: email, type: 'password_reset' });
        await Otp.create({ email: email, otp: otpCode, type: 'password_reset' });

        req.session.resetEmail = email;
        console.log(`Forgot password OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'password_reset');

        // Pass message and error as null for consistency
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

        // Find user by email and ensure they are NOT an admin
        const user = await User.findOne({ email: email, role: 'user' }); // Only update 'user' role passwords here
        if (!user) {
            console.log(`Reset password POST: User not found or is admin for email ${email}`);
            return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('User not found.'));
        }

        user.password = newPassword;
        await user.save();
        console.log(`Password successfully reset for user ${email}`);

        delete req.session.resetEmail;

        res.redirect('/auth?message=' + encodeURIComponent('Password reset successfully! You can now login.'));

    } catch (error) {
        console.error("Password reset error:", error);
        res.render('reset_password', { email: email, error: 'Failed to reset password. Please try again later.' });
    }
});

module.exports = router;