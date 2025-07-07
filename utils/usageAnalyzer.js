// utils/usageAnalyzer.js

function analyzeUsage(user) {
    const history = user.historicalResults || [];
    const last = user.lastResult;

    if (!last || history.length < 2) {
        return null;
    }

    const current = last.totalConsumption;
    const previous = history[1]?.totalConsumption || 0;
    const increase = current - previous;
    const percentChange = previous > 0 ? ((increase / previous) * 100).toFixed(1) : 'N/A';

    const suggestions = [];

    if (percentChange !== 'N/A') {
        if (percentChange > 15) {
            suggestions.push(`⚠️ Your energy usage increased by ${percentChange}%. Consider checking if any new or inefficient appliance is being used more often this month.`);
        } else if (percentChange < -10) {
            suggestions.push(`✅ Great job! You've reduced your consumption by ${Math.abs(percentChange)}%. Keep up the energy-saving habits!`);
        } else {
            suggestions.push(`🔄 Your energy usage stayed fairly consistent compared to last month.`);
        }
    }

    if (current > 300) {
        suggestions.push(`💡 Your consumption is quite high. Consider reviewing major power consumers like AC, geyser, and refrigerator for efficiency.`);
    } else if (current < 150) {
        suggestions.push(`🌱 Your consumption is relatively low — keep maintaining good energy habits and monitoring regularly!`);
    }

    return {
        summary: `📊 Compared to last month, your usage changed by ${percentChange}%.`,
        tips: suggestions
    };
}

module.exports = { analyzeUsage };
