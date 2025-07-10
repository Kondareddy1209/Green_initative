// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('connect-flash'); // <--- ADD THIS LINE

const app = express();

app.set('trust proxy', 1);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_init', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_fallback_super_secret_key_please_change_this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/green_init',
        collectionName: 'sessions',
        ttl: 1000 * 60 * 60 * 24
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: process.env.NODE_ENV === 'production' && app.get('env') !== 'development',
        httpOnly: true
    }
}));

// --- IMPORTANT: Initialize connect-flash AFTER session middleware ---
app.use(flash()); // <--- ADD THIS LINE

// --- OPTIONAL: Make flash messages available to all EJS templates ---
// This middleware makes req.flash messages available as res.locals variables
// so you can use them directly in your EJS like <%= success_msg %>
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // Often used for Passport.js errors
    next();
});
// --- END OPTIONAL BLOCK ---


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const dashboardRoutes = require('./routes/dashboard');
const pdfRoutes = require('./routes/pdf');
const adminRoutes = require('./routes/admin');
const donationsRoutes = require('./routes/donations');
const aiChatRoutes = require('./routes/ai_chat');

app.use('/auth', authRoutes);
app.use('/admin/login', adminAuthRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard', pdfRoutes);
app.use('/admin', adminRoutes);
app.use('/donations', donationsRoutes);
app.use('/ai-chat', aiChatRoutes);

app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard/home');
    }
    res.redirect('/auth');
});

app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err.stack);
    res.status(500).send('Something broke on the server! Please try again later.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});