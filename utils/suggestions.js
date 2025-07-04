// utils/suggestions.js
function generateSmartSuggestions(currentConsumption, previousConsumption, currentBillAmount, historicalData = []) {
    let suggestions = [];

    // 1. Comparison with previous month
    if (previousConsumption && currentConsumption !== undefined) {
        const change = currentConsumption - previousConsumption;
        if (change > 0) {
            suggestions.push({
                type: 'consumption-increase',
                message: `Your consumption increased by ${change.toFixed(1)} kWh compared to last month. Review recent changes in appliance use.`,
                action: 'Check appliance usage, look for leaks (AC/Water heater).'
            });
        } else if (change < 0) {
            suggestions.push({
                type: 'consumption-decrease',
                message: `Great job! You reduced consumption by ${Math.abs(change).toFixed(1)} kWh. Keep it up!`,
                action: 'Continue energy-saving habits.'
            });
        }
    }

    // 2. High usage thresholds (example numbers, adjust for your region's averages)
    if (currentConsumption > 300) {
        suggestions.push({
            type: 'high-usage',
            message: `Your energy consumption is quite high. Consider an energy audit or checking insulation.`,
            action: 'Professional audit, seal air leaks, upgrade insulation.'
        });
    } else if (currentConsumption > 150) {
         suggestions.push({
            type: 'moderate-usage',
            message: `Moderate consumption. Focusing on efficiency can lead to significant savings.`,
            action: 'Switch to LED, unplug idle electronics, optimize AC/heating.'
        });
    }

    // 3. Bill amount-based (if available and high)
    if (currentBillAmount > 5000 && currentConsumption < 100) { // High bill despite low consumption
        suggestions.push({
            type: 'tariff-check',
            message: `Your bill seems high for your usage. Check your electricity tariff or provider rates.`,
            action: 'Contact utility provider, compare tariff plans.'
        });
    }

    // 4. Trends from historical data (if you have enough data points)
    if (historicalData.length >= 3) { // Need at least 3 months for a basic trend
        const last3Months = historicalData.slice(0, 3).map(r => r.totalConsumption);
        const avgLast3 = last3Months.reduce((a, b) => a + b, 0) / last3Months.length;

        if (currentConsumption > avgLast3 * 1.2) { // 20% higher than last 3 month average
            suggestions.push({
                type: 'unusual-spike',
                message: `Your current consumption is higher than your recent average. Investigate unusual appliance use.`,
                action: 'Check for new appliances, extended usage, or faulty devices.'
            });
        }
    }

    // Add more sophisticated suggestions here based on specific data points
    // e.g., if you capture "number of residents", "house type", etc.

    return suggestions;
}
module.exports = { generateSmartSuggestions };