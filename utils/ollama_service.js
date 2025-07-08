    // utils/ollama_service.js
    // No longer requires 'ollama' npm package directly for chat, but keep if other ollama features are used elsewhere.
    // const ollama = require('ollama'); // Potentially remove this line if not used at all.

    // Configuration for Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    /**
     * Sends a chat message history to Gemini API and gets a response.
     * @param {Array<Object>} messages An array of message objects { role: 'user' | 'assistant' | 'tool', content: '...' }.
     * @returns {Promise<Object>} A promise that resolves to the Gemini API response object.
     * @throws {Error} If there's an issue communicating with the Gemini API.
     */
    async function ollamaChat(messages) { // Renamed from ollamaChat to be more generic, but keeping for now
        if (!GEMINI_API_KEY) {
            throw new Error("Gemini API Key is not configured. Please set GEMINI_API_KEY in your .env file.");
        }
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array must be non-empty and valid.");
        }

        // Map roles for Gemini API (Gemini expects 'user' and 'model')
        const geminiMessages = messages.map(msg => {
            let role = msg.role;
            if (role === 'assistant') {
                role = 'model';
            } else if (role === 'tool') {
                // Gemini tool messages might need specific formatting,
                // for now, we'll treat them as 'user' content for simplicity
                // or you might need a more complex tool_code structure.
                // For basic text-based tool output, treating as user content is a workaround.
                // For actual tool_code execution, the agent_core would handle it.
                role = 'user';
            }
            return {
                role: role,
                parts: [{ text: msg.content }]
            };
        });

        // Ensure the last message is always from 'user' for generateContent
        if (geminiMessages[geminiMessages.length - 1].role === 'model') {
            // This scenario should ideally not happen if agent_core correctly formats history,
            // but as a safeguard, you might need to adjust.
            // For now, assuming the last message is always the user's current query.
        }

        const payload = {
            contents: geminiMessages
            // You can add generationConfig here for safety settings, temperature, etc.
            // generationConfig: {
            //     temperature: 0.5,
            //     topP: 0.9,
            //     topK: 40,
            // }
        };

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[GeminiService Error] API response not OK:", errorData);
                throw new Error(`Gemini API error: ${errorData.error.message || response.statusText}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                return {
                    message: {
                        role: 'assistant', // Map Gemini's 'model' back to 'assistant' for your agent_core
                        content: result.candidates[0].content.parts[0].text
                    },
                    // Add other properties from Gemini response if needed
                };
            } else {
                console.warn("[GeminiService] Unexpected Gemini API response structure:", result);
                throw new Error("Gemini API returned an unexpected response structure.");
            }

        } catch (error) {
            console.error(`[GeminiService Error] Failed to get response from AI:`, error);
            throw new Error(`Failed to get response from AI: ${error.message}`);
        }
    }

    module.exports = {
        ollamaChat, // Keep the name ollamaChat for compatibility with agent_core.js
    };
    
