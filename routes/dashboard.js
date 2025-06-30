const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const { extractTextFromImage, parseBillText } = require('../utils/ocrParser');
const { generateTips } = require('../utils/tips');

// ✅ Middleware to check authentication
function authCheck(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

// ✅ Multer configuration for uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ✅ Dashboard main page
router.get('/', authCheck, (req, res) => {
  res.render('dashboard');
});

// ✅ User profile page
router.get('/profile', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  res.render('profile', { user });
});

// ✅ Profile update handler
router.post('/update-profile', authCheck, async (req, res) => {
  try {
    const { mobile } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { mobile });
    res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.send('❌ Failed to update profile.');
  }
});

// ✅ Home page with summary and tips
router.get('/home', authCheck, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();

  let tips = [];
  if (user?.lastResult?.totalConsumption !== undefined) {
    tips = generateTips(user.lastResult.totalConsumption);
  } else {
    tips = [
      "Turn off lights when not in use.",
      "Use natural daylight.",
      "Unplug idle chargers."
    ];
  }

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

  console.log("🧾 Home view showing lastResult:", summary);

  res.render('home', { user, tips, summary });
});

// ✅ Analyze uploaded electricity bill image
router.post('/analyze', authCheck, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.send('❌ No file uploaded');

  const fullPath = path.join(__dirname, '..', 'uploads', req.file.filename);
  console.log("📄 Starting OCR for:", fullPath);

  try {
    const rawText = await extractTextFromImage(fullPath);
    const bill = parseBillText(rawText);

    if (!bill.totalAmount || !bill.energyUsage?.length) {
      return res.send("❌ Couldn't extract bill details.");
    }

    const totalConsumption = bill.energyUsage[0].consumption;
    const carbonKg = bill.carbonKg;
    const savingsTip = bill.savingsTip;

    console.log({
      totalConsumption,
      carbonKg,
      totalAmount: bill.totalAmount,
      savingsTip
    });

    // ✅ Save to user profile in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
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
      { new: true } // ensures updated doc is returned
    );

    console.log("✅ Updated User Record:", updatedUser?.lastResult);
    res.redirect('/dashboard/home');
  } catch (err) {
    console.error('❌ Error during bill analysis:', err);
    res.send('❌ Internal error during analysis.');
  }
});

// ✅ Logout handler
router.get('/logout', authCheck, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
