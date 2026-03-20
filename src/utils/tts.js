const axios = require('axios');
const { Readable } = require('stream');

/**
 * Fetches audio (MP3) for a given text using Google Translate's unofficial TTS.
 * No API key needed.
 * @param {string} text – Text to speak (up to 200 characters recommended)
 * @returns {Promise<Readable>} – Stream of the MP3 audio
 */
async function getTTSAudio(text) {
  // Limit text length to avoid issues
  const truncated = text.slice(0, 200);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncated)}&tl=fr&client=tw-ob`;
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  return response.data;
}

module.exports = { getTTSAudio };