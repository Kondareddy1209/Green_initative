// utils/gamification.js

// Define all possible badges and their criteria
const BADGE_CRITERIA = {
    'welcome-user': {
        name: 'Welcome User',
        description: 'Joined the MyGreenHome initiative!',
        image: '/images/badges/welcome-user.png',
        criteria: user => true, // Awarded at signup
        points: 0 // No points directly from this, it's an initial badge
    },
    'eco-newbie': {
        name: 'Eco Newbie',
        description: 'Analyzed your very first electricity bill!',
        image: '/images/badges/eco-newbie.png',
        criteria: user => user.achievementsTracker.billsAnalyzedCount === 1,
        points: 50 // Points for earning this badge
    },
    'energy-saver-bronze': {
        name: 'Energy Saver (Bronze)',
        description: 'Reduced consumption by at least 10 kWh in a single month.',
        image: '/images/badges/energy-saver-bronze.png',
        criteria: (user, currentConsumption, previousConsumption) =>
            previousConsumption !== null && // Ensure there was a previous month
            (previousConsumption - currentConsumption) >= 10 &&
            !user.badges.includes('energy-saver-bronze'), // Check if not already earned
        points: 75
    },
    'green-guru-level1': {
        name: 'Green Guru (Level 1)',
        description: 'Analyzed 3 electricity bills.',
        image: '/images/badges/green-guru-level1.png',
        criteria: user => user.achievementsTracker.billsAnalyAnalyzedCount >= 3 &&
            !user.badges.includes('green-guru-level1'),
        points: 100
    },
    'carbon-crusader-novice': {
        name: 'Carbon Crusader (Novice)',
        description: 'Achieved a total reduction of 50 kg CO₂ emissions.',
        image: '/images/badges/carbon-crusader-novice.png',
        criteria: user => user.achievementsTracker.totalConsumptionReduced >= (50 / 0.82) && // 50kg CO2 roughly 50/0.82 kWh
            !user.badges.includes('carbon-crusader-novice'),
        points: 120
    }
    // Add more badges here as you expand features
    // 'solar-supporter': { ... }, 'water-wise': { ... }
};

// Function to calculate points and award badges after a new analysis
function calculateGamification(user, newAnalysisData, previousAnalysisData) {
    let earnedPoints = 0;
    let newBadges = [];

    // Points for general actions
    if (user.achievementsTracker.billsAnalyzedCount === 1) { // Bonus for first analysis (after incrementing billsAnalyzedCount)
        earnedPoints += 100;
    } else if (user.achievementsTracker.billsAnalyzedCount > 1) {
        earnedPoints += 20; // Points for each subsequent analysis
    }

    // Points for consumption reduction
    if (previousAnalysisData && previousAnalysisData.totalConsumption !== undefined && newAnalysisData.totalConsumption !== undefined) {
        const consumptionReduction = previousAnalysisData.totalConsumption - newAnalysisData.totalConsumption;
        if (consumptionReduction > 0) {
            earnedPoints += Math.floor(consumptionReduction); // 1 point per kWh reduced
            user.achievementsTracker.totalConsumptionReduced = (user.achievementsTracker.totalConsumptionReduced || 0) + consumptionReduction; // Update tracker
        }
    }

    // Check for new badges
    for (const badgeKey in BADGE_CRITERIA) {
        const badge = BADGE_CRITERIA[badgeKey];
        // Skip 'welcome-user' here as it's awarded at signup
        if (badgeKey === 'welcome-user') continue;

        // Check if badge is not already earned AND if criteria are met
        if (!user.badges.includes(badgeKey) &&
            badge.criteria(user, newAnalysisData.totalConsumption, previousAnalysisData?.totalConsumption)) {
            newBadges.push(badgeKey);
            earnedPoints += badge.points; // Add badge points
        }
    }

    return { earnedPoints, newBadges };
}

// Function to initialize gamification for a new user (at signup)
function initializeNewUserGamification() {
    return {
        points: 50, // Initial signup bonus points
        badges: ['welcome-user'], // Example initial badge
        achievementsTracker: {
            billsAnalyzedCount: 0, // Starts at 0, incremented on first analysis
            totalConsumptionReduced: 0
        }
    };
}

// Helper to get full badge details for rendering in EJS
const getAllBadgeDetails = () => {
    const details = {};
    for (const key in BADGE_CRITERIA) {
        details[key] = {
            name: BADGE_CRITERIA[key].name,
            description: BADGE_CRITERIA[key].description,
            image: BADGE_CRITERIA[key].image
        };
    }
    return details;
};

module.exports = {
    calculateGamification,
    initializeNewUserGamification,
    getAllBadgeDetails,
    BADGE_CRITERIA // Export for potential use in admin or specific badge pages
};