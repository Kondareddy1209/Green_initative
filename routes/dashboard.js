// routes/dashboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const { parseEnergyBill } = require('../utils/mindee');

function authCheck(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET Home with user info and tips
router.get('/home', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  const tips = [
    "Turn off lights when not in use.",
    "Switch to LED bulbs.",
    "Unplug chargers when idle.",
    "Run appliances with full loads.",
    "Use natural light during the day."
  ];
  res.render('home', { user, tips });
});

// GET Dashboard upload page
router.get('/', authCheck, (req, res) => {
  res.render('dashboard');
});

// POST analyze
router.post('/analyze', authCheck, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.send('❌ No file uploaded');

  const fullPath = path.join(__dirname, '..', 'uploads', req.file.filename);
  const imagePath = '/uploads/' + req.file.filename;

  try {
    const bill = await parseEnergyBill(fullPath);
    if (!bill.totalAmount) {
      return res.send("❌ Couldn't extract bill details.");
    }

    const totalConsumption = bill.energyUsage.reduce((a, u) => a + u.consumption, 0);
    const carbonKg = (totalConsumption * 0.82).toFixed(1);
    const savingsTip = totalConsumption > 200
      ? 'Shift high‑energy tasks to off‑peak hours.'
      : 'Usage looks optimal—great job!';

    res.render('result', { bill, imagePath, totalConsumption, carbonKg, savingsTip });
  } catch (err) {
    console.error('Error parsing bill:', err);
    res.send('❌ Internal error during analysis.');
  }
});

// GET Logout route
router.get('/logout', authCheck, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
