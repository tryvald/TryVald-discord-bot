const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');
const ownerConfig = require('../../utils/ownerConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listen')
    .setDescription('Toggle listening to a server (owner only).')
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server to listen to')
        .setRequired(true)),
  async execute(interaction) {
    // Owner check
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.options.getString('server_id');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: '❌ I am not in that server.', flags: MessageFlags.Ephemeral });
    }

    const isListening = ownerConfig.isListening(guildId);
    if (isListening) {
      ownerConfig.removeListeningGuild(guildId);
      await interaction.reply({ content: `🔇 Stopped listening to **${guild.name}** (${guildId}).`, flags: MessageFlags.Ephemeral });
    } else {
      ownerConfig.addListeningGuild(guildId);
      await interaction.reply({ content: `🎧 Now listening to **${guild.name}** (${guildId}). All messages will be forwarded to your DMs.`, flags: MessageFlags.Ephemeral });
    }
  },
};