// routes/dashboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { extractTextFromImage, parseBillText } = require('../utils/ocrParser');
const { generateTips } = require('../utils/tips');
const { sendBillAnalysisEmail } = require('../utils/mailer');
const { calculateGamification, getAllBadgeDetails } = require('../utils/gamification'); // NEW IMPORTS for gamification

// Middleware: check if user is authenticated
function authCheck(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth'); // Redirect to /auth base route if not logged in
    }
    next();
}

// --- Multer Configuration for Profile Picture Upload ---
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'profile-' + req.session.userId + '-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadProfilePicture = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Only images (jpeg, jpg, png, gif) are allowed!'));
        }
    }
}).single('profilePicture');

// --- Existing Multer for Bill Analysis ---
const billStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) =>
        cb(null, 'bill-' + Date.now() + path.extname(file.originalname)) // Prefix bill uploads
});
const uploadBill = multer({ storage: billStorage });


/* ========== Dashboard GET Route ========== */
router.get('/', authCheck, async (req, res) => {
    try {
        // Fetch the user to get their latest data including gamification and historical results
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
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
router.post('/analyze', authCheck, uploadBill.single('photo'), async (req, res) => {
    if (!req.file) return res.send('❌ No file uploaded');
    const fullPath = path.join(__dirname, '..', 'uploads', req.file.filename);

    try {
        const rawText = await extractTextFromImage(fullPath);
        const bill = parseBillText(rawText);

        if (!bill.totalAmount || !bill.energyUsage?.length) {
            // It's possible OCR fails to find values, return a specific error
            fs.unlink(fullPath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting failed bill image:", unlinkErr); });
            return res.status(400).send("❌ Could not extract sufficient bill details from the image. Please try another image or ensure it's clear.");
        }

        const totalConsumption = bill.energyUsage[0].consumption;
        const carbonKg = bill.carbonKg;
        const savingsTip = bill.savingsTip;

        // Fetch the user to get their current state and previous analysis
        const user = await User.findById(req.session.userId);
        if (!user) {
            console.error("User not found during bill analysis, session invalid.");
            req.session.destroy();
            return res.redirect('/auth');
        }

        // Get previous analysis data for gamification and comparison
        const previousAnalysisData = user.historicalResults.length > 0 ? user.historicalResults[0] : null;

        // Prepare new result object
        const newResult = {
            totalConsumption: totalConsumption,
            carbonKg: carbonKg,
            totalAmount: bill.totalAmount,
            energyUsage: bill.energyUsage,
            savingsTip: savingsTip,
            analysisDate: new Date()
        };

        // --- NEW: Gamification Logic ---
        // Increment billsAnalyzedCount first as it's part of badge criteria
        user.achievementsTracker.billsAnalyzedCount = (user.achievementsTracker.billsAnalyzedCount || 0) + 1;
        
        const { earnedPoints, newBadges } = calculateGamification(user, newResult, previousAnalysisData);

        user.points = (user.points || 0) + earnedPoints;
        user.badges.push(...newBadges); // Add new badges to user's badges array
        console.log(`User ${user.email} earned ${earnedPoints} points. New badges: ${newBadges.join(', ')}`);
        // --- End Gamification Calculation ---

        // Update user: push new result to historicalResults and set as lastResult
        user.historicalResults.unshift(newResult); // Add to beginning of array
        user.lastResult = newResult; // Set as the most recent result

        // Save the updated user document (including gamification changes)
        await user.save(); // Use .save() to ensure pre-save hooks are respected

        // Send bill analysis email
        if (user?.email) {
            await sendBillAnalysisEmail(user.email, newResult);
        }

        // Update session user data to reflect changes in points, badges, etc.
        // This is important so that subsequent page loads reflect the updated data
        req.session.user = user;

        res.redirect('/dashboard');
    } catch (err) {
        console.error('❌ OCR Analysis Error:', err);
        res.status(500).send('❌ Internal error during analysis.');
    } finally {
        // Ensure cleanup of the uploaded bill image
        if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting bill image:", unlinkErr);
            });
        }
    }
});


/* ========== Home Page ========== */
router.get('/home', authCheck, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }
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
    } catch (error) {
        console.error("Error fetching user for home page:", error);
        res.status(500).send("Server Error");
    }
});

/* ========== Profile ========== */
router.get('/profile', authCheck, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        res.render('profile', { user, message: req.query.message || null });
    } catch (error) {
        console.error("Error fetching user for profile page:", error);
        res.status(500).send("Server Error");
    }
});

router.get('/edit-profile', authCheck, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }
        res.render('edit-profile', { user, message: req.query.message || null, error: req.query.error || null });
    } catch (error) {
        console.error("Error fetching user for edit profile page:", error);
        res.status(500).send("Server Error");
    }
});

router.post('/update-profile', authCheck, (req, res) => {
    uploadProfilePicture(req, res, async (err) => {
        if (err) {
            console.error('Profile picture upload error:', err);
            return res.redirect(`/dashboard/edit-profile?error=${encodeURIComponent(err.message || 'File upload failed.')}`);
        }

        try {
            const userId = req.session.userId;
            const { firstName, lastName, mobile, gender, email } = req.body;

            let updateData = { firstName, lastName, mobile, gender };

            if (email !== undefined && email !== null && email.trim() !== '') {
                 const existingUserWithEmail = await User.findOne({ email: email.trim(), _id: { $ne: userId } });
                if (existingUserWithEmail) {
                    return res.redirect(`/dashboard/edit-profile?error=${encodeURIComponent('Email already in use by another account.')}`);
                }
                updateData.email = email.trim();
                updateData.username = email.trim(); // Update username to match new email
            }

            if (req.file) {
                const user = await User.findById(userId);
                if (user && user.profilePicture && user.profilePicture !== '/images/default_image.png') { // Use default_image.png
                    const oldImagePath = path.join(__dirname, '..', user.profilePicture);
                    fs.unlink(oldImagePath, (unlinkErr) => {
                        if (unlinkErr) console.error("Error deleting old profile picture:", unlinkErr);
                    });
                }
                updateData.profilePicture = `/uploads/${req.file.filename}`;
            }

            const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
            req.session.user = updatedUser; // Update session user object

            res.redirect('/dashboard/profile?message=' + encodeURIComponent('Profile updated successfully!'));

        } catch (updateErr) {
            console.error('Error updating user profile:', updateErr);
            if (updateErr.code === 11000) {
                let errorMessage = 'An account with this email already exists.';
                return res.redirect(`/dashboard/edit-profile?error=${encodeURIComponent(errorMessage)}`);
            }
            res.redirect(`/dashboard/edit-profile?error=${encodeURIComponent('Failed to update profile due to a server error.')}`);
        }
    });
});

/* ========== NEW: Tracking Page (Historical Data & Comparison) ========== */
router.get('/tracking', authCheck, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }

        let currentMonthData = null;
        let previousMonthData = null;
        let comparison = null;

        if (user.historicalResults && user.historicalResults.length > 0) {
            // Sort to ensure the most recent is always first (though unshift adds to beginning)
            const sortedResults = user.historicalResults.sort((a, b) => new Date(b.analysisDate) - new Date(a.analysisDate));

            currentMonthData = sortedResults[0]; // Most recent
            if (sortedResults.length > 1) {
                previousMonthData = sortedResults[1]; // Second most recent

                const currentConsumption = currentMonthData.totalConsumption;
                const previousConsumption = previousMonthData.totalConsumption;

                if (currentConsumption !== undefined && previousConsumption !== undefined) {
                    if (previousConsumption === 0) { // Avoid division by zero
                        comparison = {
                            change: currentConsumption,
                            percentage: 'N/A', // Cannot calculate percentage change from zero
                            message: `You consumed ${currentConsumption} kWh this month. (Previous consumption was 0 kWh)`
                        };
                    } else {
                        const change = currentConsumption - previousConsumption;
                        const percentageChange = ((change / previousConsumption) * 100).toFixed(1);
                        if (change > 0) {
                            comparison = {
                                change: change,
                                percentage: percentageChange,
                                message: `Your consumption increased by ${change.toFixed(1)} kWh (${percentageChange}%) compared to last month.`
                            };
                        } else if (change < 0) {
                            comparison = {
                                change: Math.abs(change),
                                percentage: Math.abs(percentageChange),
                                message: `Your consumption decreased by ${Math.abs(change).toFixed(1)} kWh (${Math.abs(percentageChange)}%) compared to last month. Great job!`
                            };
                        } else {
                            comparison = {
                                change: 0,
                                percentage: 0,
                                message: 'Your consumption remained the same as last month.'
                            };
                        }
                    }
                }
            }
        }

        res.render('tracking', {
            user,
            historicalResults: user.historicalResults, // Pass all historical results for the table
            currentMonthData,
            previousMonthData,
            comparison
        });

    } catch (error) {
        console.error("Error loading tracking page:", error);
        res.status(500).send("Server Error");
    }
});


/* ========== NEW: Badges Page (Display User's Badges) ========== */
// routes/dashboard.js (Relevant part: '/badges' route)

/* ========== NEW: Badges Page (Display User's Badges) ========== */
router.get('/badges', authCheck, async (req, res) => {
    try {
        // Fetch the user data from DB to ensure it's fresh, including gamification fields
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            console.log("Badges page: User not found for session ID:", req.session.userId);
            req.session.destroy();
            return res.redirect('/auth');
        }

        // Ensure user.badges is an array, even if undefined for old users
        const userBadges = Array.isArray(user.badges) ? user.badges : [];

        const allBadgeDetails = getAllBadgeDetails(); // Get all possible badge details from gamification utility

        // Filter and map earned badges to their full details
        const earnedBadgeDetails = userBadges.map(badgeKey => {
            if (!allBadgeDetails[badgeKey]) {
                console.warn(`Warning: User ${user.email} has unknown badgeKey: ${badgeKey}`);
                return null; // Return null if badgeKey doesn't exist in criteria
            }
            return allBadgeDetails[badgeKey];
        }).filter(Boolean); // Filter out any nulls (unknown badge keys)

        res.render('badges', {
            user, // Pass current user for navbar/profile link
            earnedBadges: earnedBadgeDetails
        });
    } catch (error) {
        console.error("Error loading badges page:", error);
        // Log the full error object for better debugging
        console.error("Badges Page Error Details:", error.message, error.stack);
        res.status(500).send("Server Error loading badges. Please try again.");
    }
});

// ... (rest of dashboard.js code) ...

/* ========== NEW: Leaderboard Page ========== */
router.get('/leaderboard', authCheck, async (req, res) => {
    try {
        // Fetch users sorted by points in descending order
        const leaderboardUsers = await User.find({})
            .sort({ points: -1 }) // Sort by points descending
            .select('firstName lastName username profilePicture points') // Select relevant fields
            .limit(10) // Limit to top 10 (or adjust as needed)
            .lean();

        const user = await User.findById(req.session.userId).lean(); // Current user for navbar

        res.render('leaderboard', {
            user, // Pass current user for navbar/profile link
            leaderboard: leaderboardUsers
        });
    } catch (error) {
        console.error("Error loading leaderboard page:", error);
        res.status(500).send("Server Error");
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
    req.session.destroy(() => res.redirect('/auth')); // Redirect to login page after logout
});

module.exports = router;