// utils/agent_core.js

const { ollamaChat } = require('./ollama_service');
const { generateTips } = require('./tips');
const { analyzeUsage } = require('./usageAnalyzer');
const { getAllBadgeDetails } = require('./gamification');
const User = require('../models/user');

const tools = [
    {
        name: "get_energy_saving_tips",
        description: "Provides actionable energy saving tips and advice. Use this tool when the user asks for 'tips', 'advice', 'ways to save energy', or 'suggestions for green living'.",
        parameters: {
            type: "object",
            properties: {
                consumption: {
                    type: "number",
                    description: "The user's last total electricity consumption in kWh. Defaults to 0 if not available from user's data.",
                },
            },
            required: []
        },
        execute: async (args, userContext) => {
            const consumption = args.consumption || userContext.lastResult?.totalConsumption || 0;
            const tips = generateTips(consumption);
            if (tips.length > 0) {
                return { result: tips.join('\n') };
            }
            return { result: "I don't have specific tips right now, but generally, try unplugging idle electronics." };
        }
    },
    {
        name: "get_latest_bill_summary",
        description: "Retrieves and summarizes the details of the user's most recent electricity bill analysis, including total consumption, carbon emissions, and bill amount. Use this tool when the user asks about 'my bill', 'my consumption', 'last usage', 'analysis results', 'how much I used', or 'monthly report'.",
        parameters: {
            type: "object",
            properties: {}
        },
        execute: async (args, userContext) => {
            if (userContext && userContext.lastResult && (userContext.lastResult.totalConsumption > 0 || userContext.lastResult.totalAmount > 0)) {
                const date = new Date(userContext.lastResult.analysisDate).toLocaleDateString();
                const consumptionSummary = userContext.lastResult.totalConsumption > 0 ?
                    `Total Consumption: ${userContext.lastResult.totalConsumption} kWh, Carbon Emissions: ${userContext.lastResult.carbonKg} kg, ` : '';
                
                const usageAnalysis = analyzeUsage(userContext);
                let extraInsight = "";
                if (usageAnalysis && usageAnalysis.summary) {
                    extraInsight = ` ${usageAnalysis.summary}`;
                }

                return {
                    message: `Your last bill analysis from ${date} shows: ${consumptionSummary}Estimated Bill Amount: ₹${userContext.lastResult.totalAmount ? userContext.lastResult.totalAmount.toFixed(2) : 'N/A'}. ${userContext.lastResult.savingsTip}.${extraInsight}`
                };
            }
            return { message: "I don't have a recent bill analysis for you. Please upload your bill so I can provide a summary. You can do that on the <a href='/dashboard' style='color:#4CAF50;text-decoration:underline;'>Analyze Bill Page</a>." };
        }
    },
    {
        name: "get_user_gamification_summary",
        description: "Provides a summary of the user's current green points and the number of bills they have analyzed. Use when the user asks about 'my points', 'my score', 'my rank', 'how many bills I analyzed', or questions related to 'gamification'.",
        parameters: {
            type: "object",
            properties: {}
        },
        execute: async (args, userContext) => {
            return {
                message: `You currently have ${userContext.points || 0} Green Points. You have analyzed ${userContext.historicalResults?.length || 0} electricity bills.`
            };
        }
    },
    {
        name: "get_badge_details",
        description: "Provides information about the user's earned badges. Can give details about a specific badge if the name/key is provided, or list all earned badges. Use when the user asks about 'my badges', 'achievements', 'what badges do I have', or 'how many badges are there'.",
        parameters: {
            type: "object",
            properties: {
                badgeKey: {
                    type: "string",
                    description: "The specific identifier of the badge (e.g., 'eco-newbie', 'energy-saver-bronze'). Optional. If not provided, list all earned badges."
                }
            },
            required: []
        },
        execute: async (args, userContext) => {
            const allBadgeData = getAllBadgeDetails();
            const userEarnedBadgesKeys = userContext.badges || [];

            if (args.badgeKey) {
                const requestedBadge = allBadgeData[args.badgeKey];
                if (requestedBadge && userEarnedBadgesKeys.includes(args.badgeKey)) {
                    return { message: `You have the "${requestedBadge.name}" badge: ${requestedBadge.description}.` };
                } else if (requestedBadge) {
                    return { message: `The "${requestedBadge.name}" badge is available. Its description is: ${requestedBadge.description}. You haven't earned this one yet.` };
                } else {
                    return { message: `I don't have information on a badge called "${args.badgeKey}".` };
                }
            } else {
                if (userEarnedBadgesKeys.length === 0) {
                    return { message: "You haven't earned any badges yet! Analyze your first bill to get started." };
                }
                const earnedBadgeDetails = userEarnedBadgesKeys.map(key => allBadgeData[key]?.name).filter(Boolean);
                return { message: `You have earned ${earnedBadgeDetails.length} badges: ${earnedBadgeDetails.join(', ')}. You can see them on the <a href='/dashboard/badges' style='color:#4CAF50;text-decoration:underline;'>Badges Page</a>.` };
            }
        }
    },
    {
        name: "guide_user_to_page",
        description: "Guides the user to a specific page within the MyGreenHome application by providing a direct HTML link. Use this when the user explicitly asks 'where can I find X', 'how do I go to Y', or 'take me to Z page'.",
        parameters: {
            type: "object",
            properties: {
                pageName: {
                    type: "string",
                    enum: ["dashboard", "tracking", "badges", "leaderboard", "donations-history", "donate", "profile", "team", "home", "admin-panel", "user-login"],
                    description: "The name of the page to guide the user to. Must be one of: 'dashboard' (for bill analysis), 'tracking', 'badges', 'leaderboard', 'donations-history', 'donate', 'profile', 'team', 'home', 'admin-panel', 'user-login'."
                }
            },
            required: ["pageName"]
        },
        execute: async (args, userContext) => {
            const pageMap = {
                "home": { name: "Home Page", link: "/dashboard/home" },
                "dashboard": { name: "Analyze Bill Page", link: "/dashboard" },
                "tracking": { name: "Tracking Page", link: "/dashboard/tracking" },
                "badges": { name: "Badges Page", link: "/dashboard/badges" },
                "leaderboard": { name: "Leaderboard Page", link: "/dashboard/leaderboard" },
                "donations-history": { name: "Donation History Page", link: "/donations/history" },
                "donate": { name: "Donate Page", link: "/donations/donate" },
                "profile": { name: "Profile Page", link: "/dashboard/profile" },
                "team": { name: "Team Page", link: "/dashboard/team" },
                "admin-panel": { name: "Admin Panel", link: "/admin" },
                "user-login": { name: "User Login Page", link: "/auth" }
            };
            const page = pageMap[args.pageName];
            if (page) {
                return { message: `You can find that on the <a href='${page.link}' style='color:#4CAF50;text-decoration:underline;'>${page.name}</a>.` };
            }
            return { message: `I can guide you to our home, dashboard, tracking, badges, leaderboard, donation history, donate, profile, team, admin panel, or user login pages. Which one would you like to visit?` };
        }
    },
];

/**
 * The core AI Agent logic. This function takes a user message and conversation history,
 * interacts with Gemini, and potentially uses defined tools to generate a response.
 * @param {string} userMessage The current message from the user.
 * @param {Object} user A lean user object from the database, containing profile and latest analysis data.
 * @param {Array<Object>} chatHistory The array of previous messages in the conversation for context.
 * @returns {Promise<{response: string, updatedHistory: Array<Object>}>} The AI agent's response and the new conversation history.
 */
async function runAgent(userMessage, user, chatHistory = []) {
    // Gemini does not support a dedicated 'system' role.
    // The system prompt is prepended to the first user message or handled as part of the overall context.
    let messagesForGemini = chatHistory.filter(msg => msg.role !== "system");

    const systemPromptContent = `
You are "MyGreenHome AI Helper", a highly knowledgeable, friendly, and concise AI assistant for a web application called "MyGreenHome". Your primary goal is to help users manage their energy consumption, understand their bills, learn about green living, and navigate the MyGreenHome application.

**User Information (for context, do NOT proactively disclose or summarize unless asked directly):**
- Name: ${user.firstName || user.username}
- Green Points: ${user.points || 0}
- Last Bill Analysis: ${user.lastResult && user.lastResult.totalConsumption > 0 ?
    `Total Consumption: ${user.lastResult.totalConsumption} kWh, Carbon Emissions: ${user.lastResult.carbonKg} kg, Estimated Bill Amount: ₹${user.lastResult.totalAmount ? user.lastResult.totalAmount.toFixed(2) : 'N/A'} (as of ${user.lastResult.analysisDate ? new Date(user.lastResult.analysisDate).toLocaleDateString() : 'N/A'}).` :
    'No recent bill analysis available or consumption is 0.'
}
- Total Bills Analyzed: ${user.historicalResults?.length || 0}

**Interaction Guidelines:**
1.  **Prioritize Tool Use:** If a user's query can be answered or acted upon by a tool, you MUST use that tool.
2.  **Conversational Responses ONLY:** After a tool call, or if no tool is used, your final response **MUST be natural language and directly address the user's query or the tool's output.** DO NOT output raw JSON, tool calls, or tool outputs directly to the user.
3.  **Conciseness:** Be brief and direct in your responses. Avoid lengthy introductions or conclusions.
4.  **Helpful & Encouraging:** Maintain a positive tone.
5.  **App Navigation:** If guiding the user to a page, always use the \`guide_user_to_page\` tool and present the result as an HTML \`<a>\` tag.
6.  **Out of Scope:** If a question is outside of energy, environment, or MyGreenHome app topics, politely decline and redirect to your purpose.
7.  **Greetings:** For simple greetings (e.g., 'hi', 'hello'), respond with a very short, friendly greeting (e.g., "Hi!") and immediately follow up by asking how you can specifically help with green initiatives, bills, or navigating the app.
8.  **No Fictional Features:** Only refer to existing pages/features listed in "MyGreenHome Web Application Features & Links" or through your tools.
9.  **Maintain Context:** Remember previous turns in the conversation. Avoid generic greetings if the user is clearly continuing a discussion or responding to your previous message.
`.trim();

    // Prepend the system prompt to the *first* user message for Gemini
    // If there's no chat history, the system prompt and current user message form the first 'user' turn.
    // If there is history, the system prompt is applied as context to the current user query.
    if (messagesForGemini.length === 0) {
        messagesForGemini.push({ role: "user", content: `${systemPromptContent}\n\nUser: ${userMessage}` });
    } else {
        // If there's existing history, add the system prompt as a "context" to the current user message.
        // This is a common way to handle system prompts for models that don't have a dedicated role.
        messagesForGemini.push({ role: "user", content: `${systemPromptContent}\n\n${userMessage}` });
    }

    try {
        let geminiResponse;
        let finalResponseContent;
        let finalUpdatedHistory = [];

        // First call to Gemini: LLM decides to generate text or call a tool
        // Pass the tools array directly to ollamaChat
        geminiResponse = await ollamaChat(messagesForGemini, tools);

        if (geminiResponse.message && geminiResponse.message.tool_calls && geminiResponse.message.tool_calls.length > 0) {
            const toolCall = geminiResponse.message.tool_calls[0];
            const toolName = toolCall.function.name;
            const toolArgs = toolCall.function.arguments;
            const toolCallId = toolCall.id; // Get the tool call ID if available

            const tool = tools.find(t => t.name === toolName);

            if (tool) {
                console.log(`[AgentCore] Executing tool: ${toolName} with arguments:`, toolArgs);
                let toolResult;
                try {
                    toolResult = await tool.execute(toolArgs, user);
                    console.log(`[AgentCore] Tool '${toolName}' executed. Result:`, toolResult);
                } catch (toolError) {
                    console.error(`[AgentCore] Error executing tool '${toolName}':`, toolError);
                    toolResult = { error: `Failed to execute tool '${toolName}'. Details: ${toolError.message}.` };
                }

                // Add assistant's tool call and tool's output to the conversation history for the next Gemini call
                const messagesWithToolOutput = [
                    ...messagesForGemini, // All messages up to the point of tool call decision
                    { role: "assistant", content: JSON.stringify({ tool_calls: [toolCall] }) }, // Represent the tool call from assistant
                    { role: "tool", content: JSON.stringify(toolResult), tool_call_id: toolCallId } // Tool's actual output
                ];

                // Second call to Gemini: LLM synthesizes response based on tool output
                const secondGeminiResponse = await ollamaChat(messagesWithToolOutput, tools); // Pass tools again
                finalResponseContent = secondGeminiResponse.message.content;
                finalUpdatedHistory = messagesWithToolOutput.concat(secondGeminiResponse.message);

            } else {
                console.warn(`[AgentCore] Gemini requested unknown tool: ${toolName}`);
                finalResponseContent = "I attempted to use an internal tool, but it seems there was an issue finding it. Can you please rephrase your request?";
                finalUpdatedHistory = messagesForGemini.concat({ role: "model", content: finalResponseContent });
            }
        } else {
            // No tool call detected, use Gemini's direct response (natural language)
            finalResponseContent = geminiResponse.message.content;
            finalUpdatedHistory = messagesForGemini.concat(geminiResponse.message);
        }

        return { response: finalResponseContent, updatedHistory: finalUpdatedHistory };

    } catch (error) {
        console.error('[AgentCore] Error in runAgent:', error.message);
        // Provide a more user-friendly error message if an unexpected issue occurs
        return {
            response: "I'm sorry, I encountered an internal error while processing your request. Please try again later.",
            updatedHistory: messagesForGemini.concat({ role: "model", content: "I'm sorry, I encountered an internal error while processing your request. Please try again later." })
        };
    }
}

module.exports = {
    runAgent,
};
