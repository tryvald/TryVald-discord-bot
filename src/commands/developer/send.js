const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send a message to a channel (owner only).')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the message to')
        .addChannelTypes(ChannelType.GuildText)
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

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    try {
      await channel.send(message);
      await interaction.reply({ content: `✅ Message sent to ${channel}.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to send message. Check permissions.', flags: MessageFlags.Ephemeral });
    }
  },
};