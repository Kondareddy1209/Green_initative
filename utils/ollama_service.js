// utils/ollama_service.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Sends a chat message history to Gemini API and gets a response, potentially with tool calls.
 * @param {Array<Object>} messages An array of message objects { role: 'user' | 'model' | 'tool', content: '...' }.
 * @param {Array<Object>} tools Optional: An array of tool definitions for Gemini to use.
 * @returns {Promise<Object>} A promise that resolves to an object containing the Gemini message (content or tool_calls).
 * @throws {Error} If there's an issue communicating with the Gemini API.
 */
async function ollamaChat(messages, tools = []) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API Key is not configured. Please set GEMINI_API_KEY in your .env file.");
    }
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Messages array must be non-empty and valid.");
    }

    // Gemini expects 'user' and 'model' roles. 'assistant' from agent_core maps to 'model'.
    // 'tool' role also needs special handling.
    const geminiContents = messages.map(msg => {
        let role = msg.role;
        if (role === 'assistant') {
            role = 'model';
        } else if (role === 'tool') {
            // Gemini expects tool outputs in a specific format: { role: 'tool', parts: [{ functionResponse: { name: 'tool_name', response: { ... } } }] }
            // For simplicity, if tool output is just text, we'll map it as user content for now.
            // If agent_core sends structured tool output, this needs refinement.
            // Based on agent_core, tool.execute returns { result: '...' } or { message: '...' }
            try {
                const toolOutput = JSON.parse(msg.content); // Assuming msg.content from agent_core is JSON stringified tool result
                if (toolOutput.result || toolOutput.message || toolOutput.error) {
                    return {
                        role: 'tool',
                        parts: [{
                            functionResponse: {
                                name: msg.tool_call_id ? msg.tool_call_id.split('_')[0] : 'unknown_tool', // Extract tool name if possible
                                response: toolOutput // Pass the structured tool result directly
                            }
                        }]
                    };
                }
            } catch (e) {
                // If not valid JSON, treat as plain text from tool
                return {
                    role: 'user', // Fallback for unstructured tool output
                    parts: [{ text: `Tool Output: ${msg.content}` }]
                };
            }
        }
        return {
            role: role,
            parts: [{ text: msg.content }]
        };
    }).filter(part => part.role !== 'system'); // Filter out system role messages for Gemini

    const payload = {
        contents: geminiContents,
        generationConfig: {
            // You can adjust temperature, topP, topK here if needed
            // temperature: 0.5,
            // topP: 0.9,
            // topK: 40,
        }
    };

    // Only include tools in the request if provided and non-empty
    if (tools && tools.length > 0) {
        payload.tools = tools.map(tool => ({
            functionDeclarations: [{
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }]
        }));
    }

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

        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
            const candidateContent = result.candidates[0].content;
            if (candidateContent.parts && candidateContent.parts.length > 0 && candidateContent.parts[0].text) {
                // Natural language response
                return {
                    message: {
                        role: 'assistant',
                        content: candidateContent.parts[0].text
                    },
                };
            } else if (candidateContent.toolCalls && candidateContent.toolCalls.length > 0) {
                // Structured tool call response
                return {
                    message: {
                        role: 'assistant',
                        tool_calls: candidateContent.toolCalls.map(tc => ({
                            function: {
                                name: tc.function.name,
                                arguments: tc.function.args // Gemini uses 'args' for arguments
                            },
                            id: tc.id // Include tool call ID if available
                        }))
                    },
                };
            }
        } else {
            console.warn("[GeminiService] Unexpected Gemini API response structure or no candidates:", result);
            throw new Error("Gemini API returned an unexpected response structure or no valid candidates.");
        }

    } catch (error) {
        console.error(`[GeminiService Error] Failed to get response from AI:`, error);
        throw new Error(`Failed to get response from AI: ${error.message}`);
    }
}

module.exports = {
    ollamaChat,
};
