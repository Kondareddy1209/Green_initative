// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_init', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecret', // IMPORTANT: Use a strong, unique secret from .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours session
}));

// View engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const pdfRoutes = require('./routes/pdf'); // Ensure this is correctly imported

// Crucial Routing Fix: Mount authRoutes at /auth
app.use('/auth', authRoutes); // All auth routes will now be prefixed with /auth
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard', pdfRoutes); // PDF routes are children of /dashboard

// Root route: Redirect to /auth for login if not authenticated
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard/home');
    }
    res.redirect('/auth'); // Redirect to the /auth base route (which renders login)
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});