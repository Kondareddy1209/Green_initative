// utils/green_ai_knowledge.js

const { generateTips } = require('./tips'); // To get random tips
const { analyzeUsage } = require('./usageAnalyzer'); // For smarter usage analysis

const KNOWLEDGE_BASE = {
    // CATEGORIES ARE ORDERED FOR EVALUATION IN getAIResponse.

    // --- HIGH PRIORITY FOR CONVERSATIONAL FLOW ---
    greetings: [
        // Consolidating specific initial greetings based on notes
        { pattern: /^(hello|hi|hey)$/i, response: "Hi! How can I help you?" }, // For simple "hi"
        { pattern: /^(how are you|how r u|how do you do|how's it going|you doing)$/i, response: "I'm doing well, thanks for asking! How can I assist you today?" },
        { pattern: /(what is your name|who are you|are you human)/i, response: "I'm your AI Green Helper 🌿, here to assist with energy saving and environmental topics." }
    ],
    thanks: [
        { pattern: /^(thank you|thanks|cheers|good job|well done)$/i, response: "You're welcome! Let me know if you'd like another tip or analysis." }
    ],

    // --- CORE FUNCTIONALITY QUESTIONS ---
    // Expanded based on notes for more specific queries and responses
    bill_analysis_explanation: [
        {
            // NEW: Pattern for "how to analyze" - provides steps and link
            pattern: /(how to|how do i|steps to|guide to|explain how to)\s*(analyse|analyze)\s*(my)?\s*bills?/i,
            response: `To analyze your electricity bill:\n1. Go to the <a href='/dashboard' style='color:#4CAF50;text-decoration:underline;' target='_blank'>Analyze Bill Page</a>.\n2. Click "Upload a New Bill" and select an image of your bill.\n3. Click "Analyze Bill".\n\nThe app will then show you a summary and insights.`
        },
        {
            // Existing pattern for asking for analysis results (data)
            // Enhanced response to be more conversational ("How, Sure please wait. Result: data")
            pattern: /(my consumption|my bill|last usage|analyse.*bill|how much i used|usage|consumption|bill|my data|results|show the analysis results)\??/i,
            dynamic: (userData) => {
                console.log("DEBUG: Entered bill_analysis_explanation dynamic block"); // Keep debug for now
                console.log("DEBUG: userData.lastResult =", userData.lastResult);

                if (userData.lastResult && (userData.lastResult.totalConsumption > 0 || userData.lastResult.totalAmount > 0)) {
                    const date = new Date(userData.lastResult.analysisDate).toLocaleDateString();
                    let base = `How, Sure please wait.\n🔎 Your last bill on ${date} shows:\n- 💰 ₹${userData.lastResult.totalAmount.toFixed(2)}`;

                    if (userData.lastResult.totalConsumption > 0) {
                        base += `\n- ⚡ ${userData.lastResult.totalConsumption} kWh\n- 🌱 ${userData.lastResult.carbonKg} kg CO₂`;

                        const smart = analyzeUsage(userData);
                        if (smart) {
                            base += `\n\n${smart.summary}\n${smart.tips.join('\n')}`;
                        }
                    } else {
                        base += `\n⚠️ Energy consumption data was missing or unreadable from this bill. Consider uploading a clearer image for better insights.`;
                    }
                    return base + "\n\nDo you have any more questions about this, or would you like general energy-saving tips?";
                }
                return "Please upload your latest bill so I can analyze your usage and provide suggestions.";
            }
        },
        { pattern: /(kwh|kilowatt-hour|unit of energy|what is kwh)/i, response: "⚡ kWh measures energy use. Higher kWh = higher consumption and bill." },
        { pattern: /(bill amount|cost breakdown|total amount|charges|how much i owe)/i, response: "💰 Your bill amount is total electricity cost, including charges and taxes." }
    ],
    tracking_data: [
        {
            // Specific pattern for Donation History based on notes
            pattern: /(show\s*my\s*donation\s*history|donation\s*history|donatioin\s*history|my\s*donations|donations|donation\s*summary)\??/i,
            dynamic: (userData) => { // Made dynamic to show dummy data from notes
                let response = "Yeah sure. Here's your donation history (showcase data):\n";
                const dummyDonations = [
                    { amount: 500, date: "placeholder", transactionDate: new Date(new Date().setMonth(new Date().getMonth() - 2)) }, // Example 2 months ago
                    { amount: 1000, date: "placeholder", transactionDate: new Date(new Date().setMonth(new Date().getMonth() - 1)) }  // Example 1 month ago
                ];
                // In a real scenario, you'd fetch from your Donation model here:
                // const realDonations = await Donation.find({ userId: userData._id }).lean();
                // if (realDonations.length > 0) {
                //   // format realDonations
                // } else {
                //   use dummyDonations
                // }

                dummyDonations.forEach((d, i) => {
                    response += `${i + 1}. Amount: ₹${d.amount}.00 - Date: ${new Date(d.transactionDate).toLocaleDateString()}\n`;
                });
                response += `\nYou can view the full details on the <a href='/donations/history' style='color:#4CAF50;text-decoration:underline;' target='_blank'>Donation History Page</a>.`;
                return response;
            }
        },
        {
            // General tracking data
            pattern: /(track|tracking|history|compare.*usage|past usage|view progress|show my past data|yes track it|can you track my usage of power)\??/i,
            dynamic: (userData) => {
                if (userData.historicalResults?.length > 0) {
                    const count = userData.historicalResults.length;
                    const latest = new Date(userData.historicalResults[0].analysisDate).toLocaleDateString();
                    return `📊 You have ${count} tracked bills (latest: ${latest}). View trends on your <a href='/dashboard/tracking' style='color:#4CAF50;text-decoration:underline;' target='_blank'>Tracking Page</a>.`;
                }
                return "Upload at least two bills to start tracking and comparing your energy usage trends.";
            }
        }
    ],
    energy_saving_tips: [
        {
            pattern: /(give me|show me|any|some|what are|generate|random|more|next|another)?\s*(?:(at\s*least\s*)?(\d+)\s*)?(?:random\s*)?(tips|advice|ways|suggestions)(?:.*?(?:energy|electricity|power|bills|cost|it))?\??|(tips|advice|suggestions)\??/i,
            dynamic: (userData, match) => {
                const consumption = userData.lastResult?.totalConsumption || 0;
                const allTips = generateTips(consumption);
                let numRequestedTips = parseInt(match[2]) || 1;
                numRequestedTips = Math.min(numRequestedTips, allTips.length, 5); // Cap at 5

                const selectedTips = [...allTips].sort(() => 0.5 - Math.random()).slice(0, numRequestedTips);
                if (selectedTips.length === 0) return "I don't have any specific tips right now. Please check back later!";

                let response = `🌱 Here ${selectedTips.length === 1 ? 'is a tip' : `are ${selectedTips.length} tips`} for you:\n`;
                selectedTips.forEach((tip, index) => response += `${index + 1}. ${tip}\n`);
                return response + "\nWould you like another tip, or tips on specific appliances?";
            }
        },
        { pattern: /(ac|air conditioning|fan|thermostat)/i, response: "🌬️ For AC: Set to 24°C, clean filters, use fans, keep curtains closed." },
        { pattern: /(light|lighting|bulbs|illumination)/i, response: "💡 For lights: Use LEDs and switch off lights when leaving rooms. Natural daylight is your best friend!" },
        { pattern: /(appliances|electronics|plug|phantom load|standby|charger|device|t\.v|television)/i, response: "🔌 Unplug devices when not in use to avoid phantom loads. Choose energy-rated appliances. For TVs, consider enabling energy-saving modes." },
        { pattern: /(fridge|refrigerator)/i, response: "🧊 For fridges: Keep coils clean, don’t overfill, close door quickly." },
        { pattern: /(geyser|heater|shower)/i, response: "⚡ Shorter hot showers and switching off heaters after use can save loads of energy." }
    ],
    environmental_facts: [
        { pattern: /(what is|tell me about) (renewable energy|green energy|clean energy|wind power|solar power|hydro power|geothermal energy)/i, response: "🌍 Renewable energy sources (solar, wind, hydro) are natural and self-replenishing, crucial for sustainability." },
        { pattern: /(climate change|global warming|earth|pollution|environment)/i, response: "🌡️ Climate change is long-term shifts in temperatures and weather patterns, often human-caused. Leads to significant environmental impacts." },
        { pattern: /(recycling|recycle|waste management|compost)/i, response: "♻️ Recycling converts waste to new materials, reducing landfills and conserving resources." }
    ],
    carbon_footprint: [
        { pattern: /(carbon|co2|emissions|footprint)/i, response: "🌱 Your carbon footprint = pollution from your energy. Lower usage = lower CO₂." },
        { pattern: /(carbon offset|neutral|net zero)/i, response: "🌳 Offset carbon by funding renewable energy or planting trees. Net zero balances emissions with removal." }
    ],
    gamification: [
        {
            pattern: /(points|score|my points|rank|my rank)/i,
            dynamic: (userData) => `🏆 You have ${userData.points || 0} Green Points! Earn more by analyzing bills and saving energy.`
        },
        { pattern: /(badges|bagdes|badge|achievements|what\s*about\s*my\s*badges|my\s*badges)\??/i, response: "🌟 Badges are for green goals! Analyze bills and reduce CO₂. View them on Dashboard." },
        { pattern: /(leaderboard|top users)/i, response: "🏅 Leaderboard shows top eco-users by points. Climb it by earning points and saving energy!" }
    ],
    // NEW: App Guide Category
    app_guide: [
        {
            pattern: /(how\s*this\s*app\s*works|app\s*guide|app\s*features|what\s*can\s*this\s*app\s*do)\??/i,
            response: `MyGreenHome helps you:\n1. 📈 Analyze your electricity bills and carbon footprint. \n2. 📊 Track your historical energy usage trends. \n3. 🌱 Get personalized energy-saving tips. \n4. 🏆 Earn points and badges through gamification. \n5. 💸 View simulated donation opportunities.\n\nWhich feature would you like to know more about?`
        },
        {
            // NEW: Pattern for "how to donate" - provides steps and link
            pattern: /(how to|how do i|steps to|guide to|explain how to)\s*(donate|contribute)\??/i,
            response: `To simulate a donation:\n1. Go to the <a href='/donations/donate' style='color:#4CAF50;text-decoration:underline;' target='_blank'>Donate Page</a>.\n2. Enter your desired amount.\n3. Click "Simulate Donation".\n\nNo real money is involved in this showcase feature.`
        }
    ],
    out_of_scope: [
        { pattern: /(who is|what is|tell me about) ([\w\s]+)/i, response: "I'm focused on energy and environment. Can I help you with that?" },
        { pattern: /(ok|alright|fine|i want|ask one question)/i, response: "Sure! What's your question about energy saving or green living?" }
    ],

    // --- Default Responses (lowest priority) ---
    default_response: "I'm your AI Green Helper 🌿 — ask me about energy-saving tips, electricity bills, or green habits!",
    apology: "I didn’t catch that. Can you rephrase, or ask about your bills, energy tips, or carbon footprint?"
};

function getAIResponse(userQuery, userData = {}) {
    const query = userQuery.toLowerCase().trim();

    const orderedCategories = [
        'greetings',
        'thanks',
        'energy_saving_tips',
        'bill_analysis_explanation',
        'tracking_data',
        'gamification',
        'carbon_footprint',
        'environmental_facts',
        'app_guide', // NEW: Added app_guide to priority
        'out_of_scope'
    ];

    for (const category of orderedCategories) {
        for (const item of KNOWLEDGE_BASE[category]) {
            const match = query.match(item.pattern);
            if (match) {
                console.log(`DEBUG: Matched pattern for category: "${category}" with query: "${userQuery}"`);
                if (item.dynamic && typeof item.dynamic === 'function') {
                    // Pass the full match object to the dynamic function
                    return item.dynamic(userData, match);
                }
                return item.response;
            }
        }
    }

    if (query.length < 5 && !query.includes('?')) {
        console.log(`DEBUG: Falling back to apology for short query: "${userQuery}"`);
        return KNOWLEDGE_BASE.apology;
    }

    console.log(`DEBUG: Falling back to default response for query: "${userQuery}"`);
    return KNOWLEDGE_BASE.default_response;
}

module.exports = { getAIResponse, KNOWLEDGE_BASE };