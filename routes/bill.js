// routes/bill.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseBillText, extractFields } = require('../utils/ocrParser');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-bill', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  const imagePath = path.join(__dirname, '..', req.file.path);
  try {
    const text = await parseBillText(imagePath);
    const fields = extractFields(text);

    if (!fields.totalAmount || !fields.unitsConsumed) {
      return res.status(422).send({ error: 'Could not extract amount or units.' });
    }

    // Generate response
    res.send({
      invoiceDate: fields.billingPeriod,
      totalAmount: fields.totalAmount,
      unitsConsumed: fields.unitsConsumed,
      carbonKg: (fields.unitsConsumed * 0.82).toFixed(1),
      summary: text
    });

  } catch (err) {
    res.status(500).send({ error: 'OCR Error', details: err.message });
  } finally {
    fs.unlinkSync(imagePath);
  }
});

module.exports = router;
