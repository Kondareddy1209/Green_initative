// routes/ai_chat.js

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/middleware'); // Auth middleware
const User = require('../models/user'); // To fetch user-specific data for personalized responses
const { runAgent } = require('../utils/agent_core'); // <--- NEW: Import your AI Agent core

// Middleware to protect AI chat routes - all routes in this file will require authentication
router.use(isAuthenticated);

// GET route to display the AI Chat interface (accessible at /ai-chat)
router.get('/', async (req, res) => {
    console.log('DEBUG: Accessing GET /ai-chat route.');
    try {
        // Fetch user data from DB to ensure it's fresh for navbar/display
        const user = await User.findById(req.session.userId).lean();
        if (!user) {
            console.log('DEBUG: User not found for session ID in GET /ai-chat. Redirecting to login.');
            req.session.destroy(); // User not found, destroy session
            return res.redirect('/auth'); // Redirect to login
        }
        res.render('ai_chat', { user: user }); // Pass user data to the EJS template
    } catch (error) {
        console.error('Error loading AI chat page:', error);
        res.status(500).send('Server Error loading AI chat interface.');
    }
});

// POST route to receive user messages and send AI responses (accessible at /ai-chat/message)
router.post('/message', async (req, res) => {
    const userMessage = req.body.message;
    // The frontend should now send the full conversational history
    const chatHistory = req.body.history || []; // Default to empty array if not provided
    const userId = req.session.userId;

    if (!userMessage || userMessage.trim() === '') {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    try {
        const user = await User.findById(userId).lean(); // Fetch user for personalized responses
        if (!user) {
            console.log('DEBUG: User not authenticated or found in POST /ai-chat/message.');
            return res.status(401).json({ error: 'User not authenticated or found.' });
        }

        console.log(`[routes/ai_chat] User ${user.email} sent message: "${userMessage}"`);
        // --- AI Agent Interaction ---
        // Call the runAgent function from your agent_core, passing user data and chat history
        const { response: aiResponse, updatedHistory } = await runAgent(userMessage, user, chatHistory);
        // --- End AI Agent Interaction ---

        console.log(`[routes/ai_chat] Agent generated response: "${aiResponse.substring(0, Math.min(aiResponse.length, 50))}..."`);

        // Send back the AI response and the updated history for the client to maintain
        res.json({ response: aiResponse, history: updatedHistory });

    } catch (error) {
        console.error('[routes/ai_chat] Error processing AI chat message:', error.message);
        // Check if the error is due to Ollama connection issues
        if (error.message.includes("Failed to get response from AI") || error.message.includes("Connection refused")) {
             return res.status(503).json({ error: "AI service is currently unavailable. Please ensure Ollama is running and try again." });
        }
        res.status(500).json({ error: 'Failed to get AI response from server. Please try again later.' });
    }
});

module.exports = router;