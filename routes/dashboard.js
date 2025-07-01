// routes/dashboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const { extractTextFromImage, parseBillText } = require('../utils/ocrParser');
const { generateTips } = require('../utils/tips');
const sendEmail = require('../utils/mailer');

// ✅ Middleware: check if user is authenticated
function authCheck(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* ========== Dashboard ========== */
router.get('/', authCheck, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.redirect('/');

    const summary = user?.lastResult
      ? {
          totalConsumption: user.lastResult.totalConsumption,
          carbonKg: user.lastResult.carbonKg,
          bill: {
            totalAmount: user.lastResult.totalAmount
          },
          savingsTip: user.lastResult.savingsTip
        }
      : null;

    const tips = summary
      ? generateTips(summary.totalConsumption)
      : [
          "Use natural daylight instead of artificial lighting.",
          "Switch off appliances when not in use.",
          "Unplug devices that are not being used."
        ];

    res.render('dashboard', { user, tips, summary });
  } catch (err) {
    console.error('❌ Error loading dashboard:', err);
    res.status(500).send('❌ Internal Server Error');
  }
});

/* ========== OCR Upload Route ========== */
router.post('/analyze', authCheck, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.send('❌ No file uploaded');
  const fullPath = path.join(__dirname, '..', 'uploads', req.file.filename);

  try {
    const rawText = await extractTextFromImage(fullPath);
    const bill = parseBillText(rawText);

    if (!bill.totalAmount || !bill.energyUsage?.length) {
      return res.send("❌ Couldn't extract bill details.");
    }

    const totalConsumption = bill.energyUsage[0].consumption;
    const carbonKg = bill.carbonKg;
    const savingsTip = bill.savingsTip;

    await User.findByIdAndUpdate(
      req.session.userId,
      {
        lastResult: {
          totalConsumption,
          carbonKg,
          totalAmount: bill.totalAmount,
          energyUsage: bill.energyUsage,
          savingsTip
        }
      },
      { new: true }
    );

    const user = await User.findById(req.session.userId).lean();
    if (user?.username) {
      await sendEmail(
        user.username,
        'Your Bill Analysis Result',
        `Your recent bill analysis:\n\nConsumption: ${totalConsumption} kWh\nCO2: ${carbonKg} kg\nTip: ${savingsTip}`
      );
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ OCR Analysis Error:', err);
    res.send('❌ Internal error during analysis.');
  }
});

/* ========== Home Page ========== */
router.get('/home', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();

  const tipsList = user?.lastResult?.totalConsumption
    ? generateTips(user.lastResult.totalConsumption)
    : [
        "Turn off lights when not in use.",
        "Use natural daylight.",
        "Unplug idle chargers."
      ];

  const summary = user?.lastResult
    ? {
        totalConsumption: user.lastResult.totalConsumption,
        carbonKg: user.lastResult.carbonKg,
        bill: {
          totalAmount: user.lastResult.totalAmount
        },
        savingsTip: user.lastResult.savingsTip
      }
    : null;

  res.render('home', { user, tips: tipsList, summary });
});

/* ========== Profile ========== */
router.get('/profile', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  res.render('profile', { user });
});

router.get('/edit-profile', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  res.render('edit-profile', { user });
});

router.post('/update-profile', authCheck, async (req, res) => {
  try {
    const { firstName, lastName, mobile, gender } = req.body;

    await User.findByIdAndUpdate(
      req.session.userId,
      { firstName, lastName, mobile, gender },
      { new: true }
    );

    res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('❌ Profile Update Error:', err);
    res.send('❌ Failed to update profile.');
  }
});



/* ========== Team Page ========== */
router.get('/team', authCheck, (req, res) => {
  res.render('team', {
    team: [
      {
        name: 'A.T. Kondareddy',
        linkedin: 'https://www.linkedin.com/in/ambavaram-tirumala-kondareddy/',
        github: 'https://github.com/kondareddy1209',
        role: 'Cloud & Cybersecurity Enthusiast',
        bio: 'Focused on cloud infrastructure, security, and ML integration for sustainability.'
      },
      {
        name: 'Katika Sahil',
        linkedin: 'https://www.linkedin.com/in/sahil-katika/',
        github: 'https://github.com/sahi-sahils',
        role: 'Full Stack Developer',
        bio: 'Passionate about building secure and scalable web apps.'
      },
      {
        name: 'E. Poojitha',
        linkedin: 'https://www.linkedin.com/in/elisetty-poojitha-ab35012b0',
        github: 'https://github.com/192211190',
        role: 'Data Analyst & UI Designer',
        bio: 'Loves analyzing energy trends and designing intuitive user experiences.'
      },
      {
        name: 'N. Sagar',
        linkedin: 'https://www.linkedin.com/in/sagarn7121',
        github: 'https://github.com/sagar7121',
        role: 'Backend & Integration Lead',
        bio: 'Specialized in OCR parsing, API integration, and server optimization.'
      }
    ]
  });
});

/* ========== Logout ========== */
router.get('/logout', authCheck, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
