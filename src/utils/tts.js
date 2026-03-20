const axios = require('axios');

async function getTTSAudio(text) {
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