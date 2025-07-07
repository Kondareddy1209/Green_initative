// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

// Configure the mail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your SMTP host/service
    auth: {
        user: process.env.EMAIL_USER,    // Your email address (e.g., from .env)
        pass: process.env.EMAIL_PASS     // Your email app password (NOT your login password)
    }
});

// Send OTP Email (adapted to take 'type' for different subjects/messages)
async function sendOTPEmail(to, otp, type = 'signup') {
    let subject = '';
    let text = '';
    let html = '';

    if (type === 'signup') {
        subject = 'MyGreenHome: Verify Your Account OTP';
        text = `Your OTP for MyGreenHome account verification is: ${otp}. This code is valid for 5 minutes.`;
        html = `
            <p>Hello,</p>
            <p>Thank you for signing up for MyGreenHome!</p>
            <p>Your One-Time Password (OTP) for account verification is:</p>
            <h3 style="color: #4CAF50;">${otp}</h3>
            <p>This code is valid for 5 minutes. Do not share this with anyone.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,<br/>The MyGreenHome Team</p>
        `;
    } else if (type === 'password_reset') {
        subject = 'MyGreenHome: Password Reset OTP';
        text = `Your OTP for password reset is: ${otp}. This code is valid for 5 minutes. Do not share this with anyone.`;
        html = `
            <p>Hello,</p>
            <p>You have requested to reset your password for your MyGreenHome account.</p>
            <p>Your One-Time Password (OTP) for password reset is:</p>
            <h3 style="color: #f44336;">${otp}</h3>
            <p>This code is valid for 5 minutes. Do not share this with anyone.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Best regards,<br/>The MyGreenHome Team</p>
        `;
    } else {
        throw new Error('Invalid OTP email type provided.');
    }

    const mailOptions = {
        from: `"MyGreenHome" <${process.env.EMAIL_USER}>`, // Sender address
        to: to,                                            // List of receivers
        subject: subject,                                  // Subject line
        text: text,                                        // Plain text body
        html: html                                         // HTML body
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email. Please check server logs.');
    }
}

// Send bill analysis result email
async function sendBillAnalysisEmail(to, result) {
    const mailOptions = {
        from: `"MyGreenHome" <${process.env.EMAIL_USER}>`, // Use EMAIL_USER
        to,
        subject: 'Your Electricity Bill Summary',
        text: `Hello,\n\nHere is your bill summary:\n\nCO₂ Emitted: ${result.carbonKg} kg/month\nTotal Consumption: ${result.totalConsumption} kWh\nEstimated Bill: ₹${result.totalAmount}\n\nTip: ${result.savingsTip}`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent:', info.response);
    } catch (error) {
        console.error('❌ Failed to send summary email:', error);
    }
}

module.exports = { sendOTPEmail, sendBillAnalysisEmail };