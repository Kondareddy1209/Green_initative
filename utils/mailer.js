// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

// Configure the mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,        // Your Gmail address
    pass: process.env.EMAIL_PASS    // Gmail app password (NOT your login password)
  }
});

// Send OTP Email
function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: `"MyGreenHome" <${process.env.EMAIL}>`,
    to,
    subject: 'Your MyGreenHome OTP',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`
  };
  return transporter.sendMail(mailOptions);
}

// Send bill analysis result email
async function sendBillAnalysisEmail(to, result) {
  const mailOptions = {
    from: `"MyGreenHome" <${process.env.EMAIL}>`,
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
