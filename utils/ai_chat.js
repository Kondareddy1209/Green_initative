< !DOCTYPE html >
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>AI Green Helper • MyGreenHome</title>
            <link rel="stylesheet" href="/styles/dashboard.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
            <style>
                body {
                    background - color: #eef2f7;
                font-family: Arial, sans-serif;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
    }

                .chat-container {
                    max - width: 800px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                flex-grow: 1;
                min-height: 60vh;
    }

                .chat-header {
                    background - color: #4caf50;
                color: white;
                padding: 15px 20px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                font-size: 1.5em;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
    }

                .chat-messages {
                    flex - grow: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
                background-color: #f8f8f8;
                border-bottom: 1px solid #eee;
    }

                .message-bubble {
                    max - width: 70%;
                padding: 10px 15px;
                border-radius: 15px;
                line-height: 1.5;
                word-wrap: break-word;
    }

                .user-message {
                    background - color: #007bff;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 2px;
    }

                .ai-message {
                    background - color: #e0e0e0;
                color: #333;
                align-self: flex-start;
                border-bottom-left-radius: 2px;
    }

                .chat-input-area {
                    padding: 15px 20px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                background-color: #fff;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
    }

                .chat-input-area input[type="text"] {
                    flex - grow: 1;
                padding: 10px 15px;
                border: 1px solid #ddd;
                border-radius: 20px;
                font-size: 1em;
    }

                .chat-input-area button {
                    background - color: #4caf50;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 10px 18px;
                cursor: pointer;
                font-size: 1em;
                transition: background-color 0.3s ease;
    }

                .chat-input-area button:hover:not(:disabled) {
                    background - color: #45a049;
    }

                .chat-input-area button:disabled {
                    background - color: #ccc;
                cursor: not-allowed;
    }
            </style>
        </head>
        <body>
            <%- include('partials/navbar') %>

            <div class="chat-container">
                <div class="chat-header">
                    <i class="fas fa-robot"></i> AI Green Helper
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input-area">
                    <input type="text" id="userMessageInput" placeholder="Type your message..." autofocus />
                    <button id="sendMessageButton" disabled>Send</button>
                </div>
            </div>

            <%- include('partials/footer') %>

            <script>
                const userMessageInput = document.getElementById('userMessageInput');
                const sendMessageButton = document.getElementById('sendMessageButton');
                const chatMessages = document.getElementById('chatMessages');
                const userName = "<%= user.firstName || user.username %>";
                let chatHistory = [];

                function scrollToBottom() {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
    }

                function addMessage(sender, message) {
      const bubble = document.createElement('div');
                bubble.classList.add('message-bubble');
                bubble.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
                bubble.innerHTML = message;
                chatMessages.appendChild(bubble);
                scrollToBottom();
    }

    userMessageInput.addEventListener('input', () => {
                    sendMessageButton.disabled = userMessageInput.value.trim() === '';
    });

                sendMessageButton.addEventListener('click', sendMessage);

    userMessageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && userMessageInput.value.trim() !== '') {
                    sendMessage();
      }
    });

                async function sendMessage() {
      const message = userMessageInput.value.trim();
                if (!message) return;

                addMessage('user', message);
                chatHistory.push({role: 'user', content: message });
                userMessageInput.value = '';
                sendMessageButton.disabled = true;

                try {
        const response = await fetch('/ai-chat/message', {
                    method: 'POST',
                headers: {'Content-Type': 'application/json' },
                body: JSON.stringify({message, history: chatHistory })
        });

                const data = await response.json();
                if (response.ok) {
          const aiResponse = data.response || "I'm having trouble responding right now.";
                addMessage('ai', aiResponse);
                chatHistory = data.history || chatHistory;
        } else {
                    addMessage('ai', `Error: ${data.error || 'Could not get response from AI.'}`);
        }
      } catch (error) {
                    console.error('Error sending message:', error);
                addMessage('ai', 'Oops! Something went wrong. Please try again later.');
      } finally {
                    sendMessageButton.disabled = false;
                userMessageInput.focus();
      }
    }

    window.addEventListener('load', () => {
      if (chatMessages.children.length === 0) {
        const initialMessage = `Hello ${userName}! I'm your AI Green Helper. How can I assist you with energy saving or understanding your bills today?`;
                addMessage('ai', initialMessage);
                chatHistory.push({role: 'assistant', content: initialMessage });
                scrollToBottom();
      }
    });
            </script>
        </body>
    </html>
