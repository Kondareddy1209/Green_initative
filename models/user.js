// models/user.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { // This will now store the user's email for consistency with login/signup
        type: String,
        required: true,
        unique: true,
        lowercase: true // Store emails in lowercase
    },
    email: { // Explicit email field, also unique
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    mobile: String,
    firstName: String,
    lastName: String,
    gender: String,
    profilePicture: { // New field for profile picture URL/path
        type: String,
        default: '/images/default_image.png' // Ensure this matches your default image filename
    },
    // Modified historicalResults to be an array for historical tracking
    historicalResults: [
        {
            billId: { type: String }, // NEW: Add Bill ID here
            totalConsumption: { type: Number, default: 0 },
            carbonKg: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
            energyUsage: [
                {
                    month: String, // e.g., "January", "February"
                    consumption: Number // kWh
                }
            ],
            savingsTip: String,
            analysisDate: { type: Date, default: Date.now } // When this analysis was done
        }
    ],
    // 'lastResult' will now point to the most recent entry in historicalResults
    lastResult: { // For easy access to the most recent analysis
        billId: { type: String }, // NEW: Add Bill ID here
        totalConsumption: { type: Number, default: 0 },
        carbonKg: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        energyUsage: [
            {
                month: String,
                consumption: Number
            }
        ],
        savingsTip: String,
        analysisDate: { type: Date, default: Date.now }
    },
    // --- Gamification Fields ---
    points: {
        type: Number,
        default: 0
    },
    badges: [
        {
            type: String // Store badge identifiers (e.g., "first-bill", "eco-champion")
        }
    ],
    // Optional: Track progress towards achievements
    achievementsTracker: {
        billsAnalyzedCount: { type: Number, default: 0 },
        totalConsumptionReduced: { type: Number, default: 0 }, // Sum of consumption decreases across analyses
    },
    // --- User Role Field ---
    role: {
        type: String,
        enum: ['user', 'admin'], // Define allowed roles
        default: 'user' // Default role for new users
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);