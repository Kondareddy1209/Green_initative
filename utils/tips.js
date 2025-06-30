// utils/tips.js
function generateTips(consumption) {
  if (consumption > 300) {
    return [
      "Switch to energy-efficient appliances.",
      "Avoid using multiple high-power devices at once.",
      "Optimize AC usage during peak hours."
    ];
  } else if (consumption > 200) {
    return [
      "Use heavy appliances during off-peak hours.",
      "Switch to star-rated appliances.",
      "Monitor your energy usage regularly."
    ];
  } else if (consumption > 100) {
    return [
      "Continue using LED lights.",
      "Reduce standby power consumption.",
      "Use natural light during the day."
    ];
  } else {
    return [
      "Keep up the great work!",
      "Maintain current energy-saving habits.",
      "Consider solar panel usage if possible."
    ];
  }
}

module.exports = { generateTips };
