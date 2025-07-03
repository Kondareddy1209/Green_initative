// routes/pdf.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const ejs = require('ejs');
const pdf = require('html-pdf');
const path = require('path');
const fs = require('fs');

router.get('/download-report', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth'); // Redirect to /auth

    const user = await User.findById(req.session.userId).lean();
    // Use lastResult from the user object directly, which is now updated
    const summary = user?.lastResult;

    if (!summary || !summary.totalConsumption) return res.send("❌ No recent bill data to generate report.");

    const reportPath = path.join(__dirname, '../views/pdf-template.ejs');

    ejs.renderFile(reportPath, { user, summary }, (err, html) => {
        if (err) {
            console.error("Error rendering PDF template:", err);
            return res.status(500).send("Error rendering PDF template");
        }

        const options = { format: 'A4', orientation: 'portrait' };

        pdf.create(html, options).toBuffer((err, buffer) => {
            if (err) {
                console.error("PDF generation failed:", err);
                return res.status(500).send("PDF generation failed");
            }

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=MyGreenHome_Report-${user.username}-${new Date().toLocaleDateString()}.pdf`, // More descriptive filename
                'Content-Length': buffer.length
            });

            res.send(buffer);
        });
    });
});

module.exports = router;