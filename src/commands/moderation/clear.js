const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete a number of messages from the channel.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1‑5000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    // Fetch messages and delete
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    const deleted = await interaction.channel.bulkDelete(messages, true); // true = filter old messages

    await interaction.reply({
      content: `🧹 Deleted **${deleted.size}** messages.`,
      ephemeral: true // Only the command user sees this
    });
  },
};