const { EndBehaviorType, createAudioResource } = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const axios = require('axios');
const FormData = require('form-data');
const { callDeepSeek } = require('../deepseek');

// Google TTS endpoint
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Store active listening states per guild
const listeningState = new Map();

/**
 * Starts listening to voice activity in a connection.
 * @param {VoiceConnection} connection - The voice connection.
 * @param {AudioPlayer} player - The audio player to play responses.
 * @param {string} guildId - The guild ID.
 * @param {Client} client - Discord client.
 */
async function startListening(connection, player, guildId, client) {
  if (listeningState.has(guildId)) return;

  const state = {
    connection,
    player,
    receiver: connection.receiver,
    active: true,
  };
  listeningState.set(guildId, state);

  connection.receiver.speaking.on('start', async (userId) => {
    if (!state.active) return;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user || user.bot) return;

    console.log(`🎙️ ${user.tag} started speaking`);

    // Subscribe to audio stream for this user
    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    // Decode Opus → PCM
    const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
    const pcmStream = audioStream.pipe(opusDecoder);

    const chunks = [];
    pcmStream.on('data', (chunk) => chunks.push(chunk));
    pcmStream.on('end', async () => {
      if (!state.active) return;
      if (chunks.length === 0) return;

      // Convert PCM to WAV
      const wavBuffer = pcmToWav(Buffer.concat(chunks), 48000, 2);

      // 1. Speech‑to‑text (Whisper)
      let transcript;
      try {
        const form = new FormData();
        form.append('file', wavBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
        form.append('model', 'whisper-1');
        const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...form.getHeaders(),
          },
        });
        transcript = res.data.text;
      } catch (err) {
        console.error('Whisper error:', err.response?.data || err.message);
        return;
      }

      if (!transcript?.trim()) return;
      console.log(`[${guildId}] ${user.tag}: ${transcript}`);

      // 2. AI response (DeepSeek)
      const reply = await callDeepSeek(transcript);
      if (!reply) return;
      console.log(`[${guildId}] Bot reply: ${reply}`);

      // 3. Text‑to‑speech (Google TTS)
      let audioContent;
      try {
        const ttsRes = await axios.post(
          `${GOOGLE_TTS_URL}?key=${process.env.GOOGLE_API_KEY}`,
          {
            input: { text: reply },
            voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' }, // French voice
            audioConfig: { audioEncoding: 'MP3' },
          }
        );
        audioContent = ttsRes.data.audioContent;
      } catch (err) {
        console.error('TTS error:', err.response?.data || err.message);
        return;
      }

      // Play the audio
      const audioBuffer = Buffer.from(audioContent, 'base64');
      const audioStream = Readable.from(audioBuffer);
      const resource = createAudioResource(audioStream, { inputType: 'mp3' });
      player.play(resource);
    });
  });

  return state;
}

/**
 * Stops listening for a guild.
 * @param {string} guildId - The guild ID.
 */
function stopListening(guildId) {
  const state = listeningState.get(guildId);
  if (state) {
    state.active = false;
    listeningState.delete(guildId);
  }
}

/**
 * Converts PCM buffer to WAV.
 * @param {Buffer} pcmBuffer - PCM data.
 * @param {number} sampleRate - Sample rate (Hz).
 * @param {number} channels - Number of channels.
 * @returns {Buffer} WAV buffer.
 */
function pcmToWav(pcmBuffer, sampleRate, channels) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcmBuffer.length;
  const totalSize = 44 + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF chunk
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);
  // fmt subchunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);          // chunk size
  wavBuffer.writeUInt16LE(1, 20);           // PCM format
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);          // bits per sample
  // data subchunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

module.exports = { startListening, stopListening };