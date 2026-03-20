process.env.FFMPEG_PATH = require('ffmpeg-static');

const { EndBehaviorType, createAudioResource, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const axios = require('axios');
const FormData = require('form-data');
const { callDeepSeek } = require('../deepseek');

// Google TTS endpoint
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Store active listening states per guild
const listeningState = new Map();

// FIX: per-user concurrency guard — prevents overlapping pipelines
const processingUsers = new Set();

/**
 * Starts listening to voice activity in a connection.
 * @param {VoiceConnection} connection
 * @param {AudioPlayer} player
 * @param {string} guildId
 * @param {Client} client
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

    // FIX: skip if this user's pipeline is still running
    if (processingUsers.has(userId)) return;
    processingUsers.add(userId);

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user || user.bot) {
      processingUsers.delete(userId);
      return;
    }

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

    // FIX: handle stream errors so pipeline doesn't silently hang
    pcmStream.on('error', (err) => {
      console.error('PCM stream error:', err.message);
      processingUsers.delete(userId);
    });

    const chunks = [];
    pcmStream.on('data', (chunk) => chunks.push(chunk));

    pcmStream.on('end', async () => {
      try {
        if (!state.active) return;
        if (chunks.length === 0) return;

        // Convert PCM → WAV
        const wavBuffer = pcmToWav(Buffer.concat(chunks), 48000, 2);

        // --- Step 1: Speech-to-text (Whisper) ---
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

        // --- Step 2: AI response (DeepSeek) ---
        const reply = await callDeepSeek(transcript);
        if (!reply) return;
        console.log(`[${guildId}] Bot reply: ${reply}`);

        // --- Step 3: Text-to-speech (Google TTS) ---
        let audioContent;
        try {
          const ttsRes = await axios.post(
            `${GOOGLE_TTS_URL}?key=${process.env.GOOGLE_API_KEY}`,
            {
              input: { text: reply },
              voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
              audioConfig: { audioEncoding: 'MP3' },
            }
          );
          audioContent = ttsRes.data.audioContent;
        } catch (err) {
          console.error('TTS error:', err.response?.data || err.message);
          return;
        }

        // FIX: renamed to ttsStream to avoid variable name collision with audioStream above
        const audioBuffer = Buffer.from(audioContent, 'base64');
        const ttsStream = Readable.from(audioBuffer);
        // FIX: use StreamType.Arbitrary instead of raw 'mp3'
        const resource = createAudioResource(ttsStream, { inputType: StreamType.Arbitrary });
        player.play(resource);

      } finally {
        // FIX: always release the user lock, even if something threw
        processingUsers.delete(userId);
      }
    });
  });

  return state;
}

/**
 * Stops listening for a guild.
 * @param {string} guildId
 */
function stopListening(guildId) {
  const state = listeningState.get(guildId);
  if (state) {
    state.active = false;
    listeningState.delete(guildId);
  }
  // Clean up any stuck processing users when leaving
  processingUsers.clear();
}

/**
 * Converts a raw PCM buffer to a WAV buffer.
 * @param {Buffer} pcmBuffer
 * @param {number} sampleRate
 * @param {number} channels
 * @returns {Buffer}
 */
function pcmToWav(pcmBuffer, sampleRate, channels) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcmBuffer.length;
  const totalSize = 44 + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF chunk descriptor
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);
  // fmt subchunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);           // PCM format
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);          // 16-bit samples
  // data subchunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

module.exports = { startListening, stopListening };