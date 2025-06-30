require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_init', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecret',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
