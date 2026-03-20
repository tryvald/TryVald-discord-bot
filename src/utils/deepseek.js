const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Calls DeepSeek API with a user message.
 * @param {string} userMessage - The user's transcript.
 * @returns {Promise<string>} - The assistant's reply.
 */
async function callDeepSeek(userMessage) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY missing in environment');
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a sassy, witty, and helpful AI assistant named Grok. Keep replies concise (max 200 characters) and fun. Use emojis occasionally. Be confident and slightly sarcastic but never mean.`
          },
          {
            role: 'user',
            content: userMessage.slice(0, 2000) // truncate long messages
          }
        ],
        max_tokens: 200,
        temperature: 0.8,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    return reply;
  } catch (error) {
    if (error.response) {
      console.error('DeepSeek API error:', error.response.status, error.response.data);
      if (error.response.status === 429) {
        return "I'm getting too many requests right now. Try again in a moment. 😅";
      }
      if (error.response.status === 401) {
        return "My API key seems invalid. Please contact the bot owner.";
      }
    } else if (error.request) {
      console.error('DeepSeek API no response:', error.request);
      return "The AI service is currently unavailable. Please try again later.";
    } else {
      console.error('DeepSeek API setup error:', error.message);
    }
    return "Something went wrong with the AI. I'm sorry! 😓";
  }
}

module.exports = { callDeepSeek };