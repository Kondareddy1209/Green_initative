// app.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser'); // Used for parsing request bodies
const path = require('path'); // Node.js built-in module for path manipulation

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_init', {
    useNewUrlParser: true, // Deprecated, but kept for compatibility
    useUnifiedTopology: true // Deprecated, but kept for compatibility
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- Middleware Setup ---
// Body parser middleware to handle form data and JSON payloads
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.json()); // For parsing application/json

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_fallback_super_secret_key_please_change_this', // VERY IMPORTANT: Use a strong, unique secret from your .env file
    resave: false, // Prevents sessions from being re-saved if they haven't been modified
    saveUninitialized: false, // Prevents creating sessions for unauthenticated users
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // Session expires after 24 hours (in milliseconds)
        secure: process.env.NODE_ENV === 'production' // Set to true in production for HTTPS only cookies
    }
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Specify the directory where EJS view files are located
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory (CSS, client-side JS, images)
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files (like profile pictures, bill images) from the 'uploads' directory
// These files will be accessible via /uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Route Imports ---
const authRoutes = require('./routes/auth'); // User authentication routes
const adminAuthRoutes = require('./routes/adminAuth'); // Admin-specific authentication routes
const dashboardRoutes = require('./routes/dashboard'); // User dashboard routes
const pdfRoutes = require('./routes/pdf'); // PDF generation routes
const adminRoutes = require('./routes/admin'); // Admin panel routes
const donationsRoutes = require('./routes/donations'); // Donations routes (NO Stripe init here)

// --- Route Mounting ---
// Mount regular user authentication routes under '/auth'
app.use('/auth', authRoutes);

// Mount admin-specific authentication routes under '/admin/login'
app.use('/admin/login', adminAuthRoutes);

// Mount dashboard-related routes under '/dashboard' (protected by user authentication)
app.use('/dashboard', dashboardRoutes);

// Mount PDF-related routes also under the '/dashboard' path
app.use('/dashboard', pdfRoutes);

// Mount admin panel routes under '/admin' (protected by admin role)
app.use('/admin', adminRoutes);

// Mount donations routes under '/donations' (protected by user authentication)
app.use('/donations', donationsRoutes);

// --- Root Route ---
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard/home');
    }
    res.redirect('/auth');
});

// --- Error Handling Middleware (Optional but Recommended) ---
app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err.stack);
    res.status(500).send('Something broke on the server! Please try again later.');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});