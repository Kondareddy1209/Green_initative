const express = require('express');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');
const router = express.Router();

function authCheck(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', authCheck, (req, res) => res.render('dashboard'));

router.post('/analyze', authCheck, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.send("❌ No file uploaded");

  const imagePath = '/uploads/' + req.file.filename;
  const fullPath = path.join(__dirname, '..', 'uploads', req.file.filename);

  try {
    const result = await Tesseract.recognize(fullPath, 'eng');
    const text = result.data.text;
    const analysis = `
🧾 Extracted Text:
${text}

📊 Sample usage: • Fan: 2.0 units/day
💡 Tip: Save energy!
    `;
    res.render('result', { result: analysis, imagePath });
  } catch (error) {
    console.error(error);
    res.send("❌ Error analyzing image");
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
