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
// useNewUrlParser and useUnifiedTopology are deprecated in newer Mongoose versions (4.0.0+ driver)
// but including them for broader compatibility if you're on an older setup.
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_init', {
    useNewUrlParser: true,
    useUnifiedTopology: true
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
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const pdfRoutes = require('./routes/pdf');
// const communityRoutes = require('./routes/community'); // Uncomment if you implement community features
const adminRoutes = require('./routes/admin'); // Import the new admin routes

// --- Route Mounting ---
// Mount authentication routes under the '/auth' path
// e.g., /auth, /auth/login, /auth/signup, /auth/forgot-password
app.use('/auth', authRoutes);

// Mount dashboard-related routes under the '/dashboard' path
// e.g., /dashboard, /dashboard/home, /dashboard/profile, /dashboard/analyze
app.use('/dashboard', dashboardRoutes);

// Mount PDF-related routes also under the '/dashboard' path
// e.g., /dashboard/download-report
app.use('/dashboard', pdfRoutes);

// Mount admin routes under the '/admin' path
// e.g., /admin, /admin/users
app.use('/admin', adminRoutes);

// Mount community routes if implemented (uncomment when ready)
// app.use('/community', communityRoutes);

// --- Root Route ---
// This is the default landing page. It redirects based on authentication status.
app.get('/', (req, res) => {
    if (req.session.userId) {
        // If user is logged in, redirect to their dashboard home
        return res.redirect('/dashboard/home');
    }
    // If not logged in, redirect to the authentication (login) page
    res.redirect('/auth');
});

// --- Error Handling Middleware (Optional but Recommended) ---
// This middleware catches errors that occur in your routes or other middleware.
app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err.stack);
    // Render a generic error page or send a simple error response
    res.status(500).send('Something broke on the server! Please try again later.');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000; // Use port from environment variable or default to 3000
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});