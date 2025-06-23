const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject: 'Your MyGreenHome OTP',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`
  };
  return transporter.sendMail(mailOptions);
}

module.exports = sendOTPEmail;
