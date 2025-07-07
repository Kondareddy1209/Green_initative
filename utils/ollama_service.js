// utils/ollama_service.js

// Ensure dotenv is loaded if you haven't done it globally in app.js
// If you load it only in app.js, make sure process.env variables are accessible here.
// require('dotenv').config();

const ollama = require('ollama'); // Requires 'ollama' npm package to be installed

// Configuration for Ollama host and model
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2'; // Default to llama2 if not specified

// Initialize Ollama client
// This client instance will be reused for all calls
const ollamaClient = new ollama.Ollama({ host: OLLAMA_HOST });

/**
 * Sends a chat message history to Ollama and gets a response.
 * @param {Array<Object>} messages An array of message objects { role: 'user' | 'assistant' | 'system' | 'tool', content: '...' }.
 * @param {boolean} [stream=false] Whether to stream the response (currently, this function only supports non-streaming).
 * @param {Object} [options={}] Additional options for the Ollama API call (e.g., temperature, top_p, etc.).
 * @returns {Promise<Object>} A promise that resolves to the Ollama API response object.
 * For non-streaming, this will contain { message: { role, content }, done, etc. }.
 * @throws {Error} If there's an issue communicating with the Ollama API.
 */
async function ollamaChat(messages, stream = false, options = {}) {
    // Basic validation for messages structure
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Messages array must be non-empty and valid.");
    }

    try {
        console.log(`[OllamaService] Sending chat request to model '${OLLAMA_MODEL}' on host '${OLLAMA_HOST}'`);
        // console.log("[OllamaService] Messages being sent:", JSON.stringify(messages, null, 2)); // Careful with logging sensitive data

        const response = await ollamaClient.chat({
            model: OLLAMA_MODEL,
            messages: messages,
            stream: stream, // Always false for now, as direct streaming to client is more complex
            options: {
                temperature: 0.5, // Default temperature for balanced responses
                top_p: 0.9,
                top_k: 40,
                num_predict: 150, // <--- REDUCED TO 150 TOKENS FOR FASTER RESPONSES
                // Merge any additional options provided
                ...options
            }
        });

        if (stream) {
            // If you later implement streaming to the client, you'd handle the ReadableStream here
            // For now, this function is configured for non-streaming response as per previous plans.
            throw new Error("Streaming not currently supported by this ollamaChat function implementation.");
        } else {
            // Return the full JSON response from Ollama for non-streaming requests
            return response;
        }

    } catch (error) {
        // Enhance error message for better debugging
        if (error.code === 'ECONNREFUSED') {
            console.error(`[OllamaService Error] Connection refused. Is Ollama server running at ${OLLAMA_HOST}?`);
        } else if (error.name === 'FetchError') { // Common for network issues
             console.error(`[OllamaService Error] Network issue or invalid host: ${error.message}`);
        } else {
            console.error(`[OllamaService Error] Failed to get response from Ollama:`, error);
        }
        throw new Error(`Failed to get response from AI: ${error.message}`);
    }
}

// You can add other Ollama API calls here if needed, e.g., for embeddings or raw generation:
// async function ollamaGenerate(prompt, options = {}) { ... }
// async function ollamaEmbeddings(text) { ... }

module.exports = {
    ollamaChat,
    // ollamaGenerate, // Export if implemented
    // ollamaEmbeddings, // Export if implemented
};