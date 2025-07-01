const express = require('express');
const router = express.Router();
const User = require('../models/user');
const ejs = require('ejs');
const pdf = require('html-pdf');
const path = require('path');
const fs = require('fs');

router.get('/download-report', async (req, res) => {
  if (!req.session.userId) return res.redirect('/');

  const user = await User.findById(req.session.userId).lean();
  const summary = user?.lastResult;

  if (!summary) return res.send("❌ No bill data to generate report.");

  const reportPath = path.join(__dirname, '../views/pdf-template.ejs');

  ejs.renderFile(reportPath, { user, summary }, (err, html) => {
    if (err) return res.status(500).send("Error rendering PDF template");

    const options = { format: 'A4', orientation: 'portrait' };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) return res.status(500).send("PDF generation failed");

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=MyGreenHome_Report.pdf`,
        'Content-Length': buffer.length
      });

      res.send(buffer);
    });
  });
});

module.exports = router;
