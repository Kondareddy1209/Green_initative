// utils/tips.js

function generateTips(consumption, amount = 0) {
  const tips = [];

  const tipBank = {
    low: [
      "You're efficient! But remember to unplug idle chargers.",
      "Dry clothes in sunlight to save energy.",
      "Use natural ventilation instead of fans or coolers."
    ],
    medium: [
      "Run washing machines and dishwashers only with full loads.",
      "Use ceiling fans to reduce AC usage.",
      "Switch off appliances at the socket to prevent standby power loss."
    ],
    high: [
      "Replace old appliances with energy-efficient models (star-rated).",
      "Install solar-powered outdoor lighting.",
      "Reduce geyser usage – use warm water only when necessary."
    ],
    bill_high: [
      "Compare monthly bills to find usage patterns.",
      "Get an energy audit done to identify hidden consumption.",
      "Use programmable timers for water heaters and ACs."
    ],
    universal: [
      "Switch to LED lighting throughout the home.",
      "Use smart power strips for entertainment setups.",
      "Keep refrigerator coils clean to reduce energy usage.",
      "Use microwave ovens instead of traditional ovens where possible.",
      "Turn off the monitor if you're away from your computer."
    ]
  };

  if (consumption < 100) {
    tips.push(...tipBank.low);
  } else if (consumption >= 100 && consumption <= 300) {
    tips.push(...tipBank.medium);
  } else {
    tips.push(...tipBank.high);
  }

  if (amount > 1000) {
    tips.push(...tipBank.bill_high);
  }

  tips.push(...tipBank.universal);

  // Shuffle and return up to 7 tips
  const shuffled = tips.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 7);
}

module.exports = { generateTips };
