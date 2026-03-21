console.log('Join command loaded');

process.env.FFMPEG_PATH = require('ffmpeg-static');

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  StreamType,
} = require('@discordjs/voice');
const { startListening } = require('../../utils/voice/listen');
const { getTTSAudio } = require('../../utils/tts');

async function playWelcomeMessage(player, text) {
  console.log('Attempting to play welcome message');
  try {
    const audioStream = await getTTSAudio(text);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });
    player.play(resource);
    console.log('Welcome message played');
  } catch (err) {
    console.error('Failed to play welcome message:', err.message);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Makes the bot join a voice channel and start listening.')
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('ID of the voice channel to join (or leave blank to use current channel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Connect),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.options.getString('channel_id');
    const voiceChannel = channelId
      ? interaction.guild.channels.cache.get(channelId)
      : interaction.member.voice.channel;

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      return interaction.editReply({ content: 'You need to be in a voice channel or specify a valid voice channel ID.', ephemeral: true });
    }

    if (!voiceChannel.joinable) {
      return interaction.editReply({ content: 'I cannot join that voice channel (missing permissions).', ephemeral: true });
    }

    const existingConnection = interaction.client.voiceConnections?.get(interaction.guild.id);
    if (existingConnection) {
      return interaction.editReply({ content: 'I am already in a voice channel. Use `/leave` first.', ephemeral: true });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      if (!interaction.client.voiceConnections) interaction.client.voiceConnections = new Map();
      interaction.client.voiceConnections.set(interaction.guild.id, connection);

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

      const player = createAudioPlayer();
      connection.subscribe(player);

      setTimeout(() => {
        playWelcomeMessage(player, 'Prout Prout Prout Prout Prout Prout Prout Prout Prout Prout caca.');
      }, 1000);

      await startListening(connection, player, interaction.guild.id, interaction.client);

      await interaction.editReply(`🎤 Joined <#${voiceChannel.id}> and listening!`);
    } catch (error) {
      console.error('Voice join error:', error);
      await interaction.editReply({ content: 'Failed to join voice channel or start listening. Check logs.', ephemeral: true });
      const conn = interaction.client.voiceConnections?.get(interaction.guild.id);
      if (conn) {
        conn.destroy();
        interaction.client.voiceConnections.delete(interaction.guild.id);
      }
    }
  },
};