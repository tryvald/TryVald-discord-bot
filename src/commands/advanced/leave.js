console.log('leave command loaded')
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { stopListening } = require('../../utils/voice/listen');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Makes the bot leave the voice channel and stop listening.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Connect),
  async execute(interaction) {
    const connection = interaction.client.voiceConnections?.get(interaction.guild.id);
    if (!connection) {
      return interaction.reply({ content: 'I am not in a voice channel.', ephemeral: true });
    }

    // Stop the listening pipeline
    stopListening(interaction.guild.id);

    // Destroy connection
    connection.destroy();
    interaction.client.voiceConnections.delete(interaction.guild.id);

    await interaction.reply('👋 Left the voice channel.');
  },
};