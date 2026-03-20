const { EndBehaviorType, createAudioResource, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { OpusEncoder } = require('@discordjs/opus');
const { Readable } = require('stream');
const axios = require('axios');
const { callDeepSeek } = require('../deepseek');
const { getTTSAudio } = require('../tts');

const WIT_AI_URL = 'https://api.wit.ai/speech?v=20231231';
const listeningState = new Map();
const processingUsers = new Set();

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
    if (processingUsers.has(userId)) return;
    processingUsers.add(userId);

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user || user.bot) {
      processingUsers.delete(userId);
      return;
    }

    console.log(`🎙️ ${user.tag} started speaking`);

    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    // Collect raw Opus packets for debugging
    const packets = [];
    audioStream.on('data', (packet) => {
      packets.push(packet);
    });

    audioStream.on('end', async () => {
      try {
        if (!state.active) return;
        if (packets.length === 0) {
          processingUsers.delete(userId);
          return;
        }

        console.log(`Received ${packets.length} Opus packets, first packet size: ${packets[0]?.length}`);

        // Attempt decoding with prism (auto frame size)
        let pcmBuffer = null;
        let decodeError = null;

        try {
          const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: null });
          const pcmChunks = [];
          decoder.on('data', (chunk) => pcmChunks.push(chunk));
          decoder.on('error', (err) => { throw err; });
          for (const packet of packets) {
            decoder.write(packet);
          }
          decoder.end();
          pcmBuffer = Buffer.concat(pcmChunks);
          console.log(`Prism decoded: ${pcmBuffer.length} bytes PCM`);
        } catch (err) {
          decodeError = err;
          console.error('Prism decode error:', err.message);
        }

        // Fallback to OpusEncoder if prism failed
        if (!pcmBuffer && decodeError) {
          try {
            const encoder = new OpusEncoder(48000, 2);
            const pcmChunks = [];
            for (const packet of packets) {
              const pcm = encoder.decode(packet);
              pcmChunks.push(pcm);
            }
            pcmBuffer = Buffer.concat(pcmChunks);
            console.log(`OpusEncoder decoded: ${pcmBuffer.length} bytes PCM`);
          } catch (err) {
            console.error('OpusEncoder decode error:', err.message);
          }
        }

        if (!pcmBuffer || pcmBuffer.length === 0) {
          console.error('No PCM data after decoding');
          processingUsers.delete(userId);
          return;
        }

        const wavBuffer = pcmToWav(pcmBuffer, 48000, 2);

        // Send to Wit.ai
        let transcript;
        try {
          const res = await axios.post(WIT_AI_URL, wavBuffer, {
            headers: {
              'Authorization': `Bearer ${process.env.WIT_AI_TOKEN}`,
              'Content-Type': 'audio/wav',
            },
          });
          transcript = res.data.text;
        } catch (err) {
          console.error('Wit.ai error:', err.response?.data || err.message);
          processingUsers.delete(userId);
          return;
        }

        if (!transcript?.trim()) {
          processingUsers.delete(userId);
          return;
        }

        console.log(`[${guildId}] ${user.tag}: ${transcript}`);

        const reply = await callDeepSeek(transcript);
        if (!reply) {
          processingUsers.delete(userId);
          return;
        }
        console.log(`[${guildId}] Bot reply: ${reply}`);

        let audioStreamTTS;
        try {
          audioStreamTTS = await getTTSAudio(reply);
        } catch (err) {
          console.error('TTS error:', err.message);
          processingUsers.delete(userId);
          return;
        }

        const resource = createAudioResource(audioStreamTTS, { inputType: StreamType.Arbitrary });
        player.play(resource);

      } catch (err) {
        console.error('Voice pipeline error:', err);
      } finally {
        processingUsers.delete(userId);
      }
    });

    audioStream.on('error', (err) => {
      console.error('Audio stream error:', err);
      processingUsers.delete(userId);
    });
  });

  return state;
}

function stopListening(guildId) {
  const state = listeningState.get(guildId);
  if (state) {
    state.active = false;
    listeningState.delete(guildId);
  }
  processingUsers.clear();
}

function pcmToWav(pcmBuffer, sampleRate, channels) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcmBuffer.length;
  const totalSize = 44 + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);
  return wavBuffer;
}

module.exports = { startListening, stopListening };