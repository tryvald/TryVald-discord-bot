const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send a message to a channel (owner only).')
    .setDMPermission(true) // Allow in DMs
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('The ID of the text channel')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message content')
        .setRequired(true)),
  async execute(interaction) {
    // Owner check
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.options.getString('server_id');
    const channelId = interaction.options.getString('channel_id');
    const message = interaction.options.getString('message');

    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: `❌ I am not in server with ID \`${guildId}\`.`, flags: MessageFlags.Ephemeral });
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: `❌ Invalid or non‑text channel ID \`${channelId}\`.`, flags: MessageFlags.Ephemeral });
    }

    try {
      await channel.send(message);
      await interaction.reply({ content: `✅ Message sent to ${channel.name} in ${guild.name}.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to send message. Check permissions.', flags: MessageFlags.Ephemeral });
    }
  },
};