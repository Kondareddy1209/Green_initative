require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/Otp');
const { sendOTPEmail } = require('../utils/mailer');
const bcrypt = require('bcryptjs');
const { initializeNewUserGamification } = require('../utils/gamification');

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

router.get('/', (req, res) => {
    res.render('login', { error: req.query.error || null, message: req.query.message || null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ email: username, role: 'user' });
        if (!user) {
            console.log(`Regular user login failed: User not found or is admin for email ${username}`);
            return res.redirect('/auth?error=' + encodeURIComponent('Invalid email or password.'));
        }

        const isMatch = await user.comparePassword(password);
        if (isMatch) {
            req.session.userId = user._id;
            req.session.user = user;
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

router.get('/signup', (req, res) => {
    res.render('signup', { error: req.query.error || null });
});

router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, mobile, password, gender } = req.body;
    try {
        if (await User.findOne({ email: email })) {
            console.log(`Signup failed: Email already exists ${email}`);
            return res.redirect('/auth/signup?error=' + encodeURIComponent('Email already exists.'));
        }

        const otpCode = generateOTP();
        await Otp.deleteMany({ email: email, type: 'signup' });

        try {
            const newOtp = await Otp.create({ email: email, otp: otpCode, type: 'signup' });
            console.log(`DEBUG: OTP successfully saved to DB: ${newOtp._id}`);
        } catch (dbError) {
            console.error(`ERROR: Failed to save OTP to database for ${email}:`, dbError);
            return res.redirect('/auth/signup?error=' + encodeURIComponent('Failed to generate OTP. Please try again.'));
        }

        const gamificationData = initializeNewUserGamification();

        req.session.pendingUser = {
            username: email,
            email,
            password,
            mobile,
            firstName,
            lastName,
            gender,
            points: gamificationData.points,
            badges: gamificationData.badges,
            achievementsTracker: gamificationData.achievementsTracker,
            role: 'user'
        };
        console.log(`Signup OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'signup');

        res.render('verify_otp', { username: email, error: null, message: null, isPasswordReset: false });
    } catch (error) {
        console.error("Signup error (general catch):", error);
        res.redirect('/auth/signup?error=' + encodeURIComponent('An error occurred during signup. Please try again later.'));
    }
});

router.post('/verify-otp', async (req, res) => {
    let { username, otp, isPasswordReset } = req.body;
    otp = otp.trim();
    const otpType = isPasswordReset === 'true' ? 'password_reset' : 'signup';

    console.log(`DEBUG: Attempting OTP verification for ${username}, type: ${otpType}, OTP: '${otp}'`);
    console.log(`DEBUG: isPasswordReset from form: ${isPasswordReset} (Type: ${typeof isPasswordReset})`);

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
            await newUser.save();
            console.log(`New user created: ${newUser.email}`);

            await Otp.deleteOne({ _id: otpRec._id });
            delete req.session.pendingUser;
            console.log(`OTP and pending user session cleared for ${username}`);

            res.redirect('/auth?message=' + encodeURIComponent('Signup successful! Please login.'));
        } else {
            const resetEmail = req.session.resetEmail;
            if (!resetEmail || resetEmail !== username) {
                console.log(`Password reset verification failed: Session resetEmail missing or mismatch for ${username}`);
                return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Session expired. Please request a new password reset.'));
            }

            await Otp.deleteOne({ _id: otpRec._id });
            console.log(`OTP deleted for password reset for ${username}. Redirecting to reset password.`);
            res.redirect('/auth/reset-password');
        }
    } catch (error) {
        console.error("OTP verification caught error:", error);
        res.render('verify_otp', { username: username, error: 'An error occurred during verification. Please try again later.', message: null, isPasswordReset: isPasswordReset === 'true' });
    }
});

router.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { error: req.query.error || null, message: req.query.message || null });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email, role: 'user' });
        if (!user) {
            console.log(`Forgot password: User not found or is admin for email ${email}. Sending generic message.`);
            return res.render('forgot_password', { message: 'If an account with that email exists, an OTP has been sent.', error: null });
        }

        const otpCode = generateOTP();
        await Otp.deleteMany({ email: email, type: 'password_reset' });
        await Otp.create({ email: email, otp: otpCode, type: 'password_reset' });

        req.session.resetEmail = email;
        console.log(`Forgot password OTP generated and sent to ${email}`);

        await sendOTPEmail(email, otpCode, 'password_reset');

        res.render('verify_otp', { username: email, message: 'OTP sent to your email for password reset.', error: null, isPasswordReset: true });
    } catch (error) {
        console.error("Forgot password OTP send error:", error);
        res.render('forgot_password', { error: 'Failed to send OTP. Please try again later.', message: null });
    }
});

router.get('/reset-password', (req, res) => {
    if (!req.session.resetEmail) {
        console.log("Reset password GET: No resetEmail in session.");
        return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Session expired. Please request a new password reset.'));
    }
    res.render('reset_password', { email: req.session.resetEmail, error: null });
});

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

        const user = await User.findOne({ email: email, role: 'user' });
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
