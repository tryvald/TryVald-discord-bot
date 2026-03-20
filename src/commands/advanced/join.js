const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { startListening } = require('../../utils/voice/listen'); // we'll create this later

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
    const channelId = interaction.options.getString('channel_id');
    const voiceChannel = channelId
      ? interaction.guild.channels.cache.get(channelId)
      : interaction.member.voice.channel;

    if (!voiceChannel || voiceChannel.type !== 2) { // 2 = GuildVoice
      return interaction.reply({ content: 'You need to be in a voice channel or specify a valid voice channel ID.', ephemeral: true });
    }

    // Check bot permissions
    if (!voiceChannel.joinable) {
      return interaction.reply({ content: 'I cannot join that voice channel (missing permissions).', ephemeral: true });
    }

    // Already connected? Check if we have an active connection
    const existingConnection = interaction.client.voiceConnections?.get(interaction.guild.id);
    if (existingConnection) {
      return interaction.reply({ content: 'I am already in a voice channel. Use `/leave` first.', ephemeral: true });
    }

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false, // we want to hear the audio
      selfMute: false,
    });

    // Store the connection in a global map (we'll set up later)
    if (!interaction.client.voiceConnections) interaction.client.voiceConnections = new Map();
    interaction.client.voiceConnections.set(interaction.guild.id, connection);

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Start the audio pipeline (listening + responding)
    const player = createAudioPlayer();
    connection.subscribe(player);
    const listener = startListening(connection, player, interaction.guild.id, interaction.client);
    // Store listener state if needed

    await interaction.reply(`🎤 Joined <#${voiceChannel.id}> and listening!`);
  },
};