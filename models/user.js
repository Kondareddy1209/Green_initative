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
        default: '/images/default_image.png' // Default image path
    },
    // Modified lastResult to be an array for historical tracking
    historicalResults: [
        {
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash the password before saving a new user or updating password
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);