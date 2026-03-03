const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');
const ownerConfig = require('../../utils/ownerConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('Manage ignored channels for listening (owner only).')
    .setDMPermission(true)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Ignore a channel in a server.')
        .addStringOption(opt =>
          opt.setName('server_id')
            .setDescription('The ID of the server')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('channel_id')
            .setDescription('The ID of the channel to ignore')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Stop ignoring a channel.')
        .addStringOption(opt =>
          opt.setName('server_id')
            .setDescription('The ID of the server')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('channel_id')
            .setDescription('The ID of the channel to stop ignoring')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List ignored channels in a server.')
        .addStringOption(opt =>
          opt.setName('server_id')
            .setDescription('The ID of the server')
            .setRequired(true))),
  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.options.getString('server_id');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: `❌ I am not in server with ID \`${guildId}\`.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'add') {
      const channelId = interaction.options.getString('channel_id');
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({ content: `❌ Channel \`${channelId}\` not found in that server.`, flags: MessageFlags.Ephemeral });
      }
      const added = ownerConfig.addIgnoredChannel(guildId, channelId);
      await interaction.reply({
        content: added ? `✅ Now ignoring ${channel.name} (${channelId}) in **${guild.name}**.` : `❌ That channel was already ignored.`,
        flags: MessageFlags.Ephemeral
      });
    }
    else if (sub === 'remove') {
      const channelId = interaction.options.getString('channel_id');
      const removed = ownerConfig.removeIgnoredChannel(guildId, channelId);
      await interaction.reply({
        content: removed ? `✅ Stopped ignoring channel \`${channelId}\` in **${guild.name}**.` : `❌ That channel was not being ignored.`,
        flags: MessageFlags.Ephemeral
      });
    }
    else if (sub === 'list') {
      const ignored = ownerConfig.getIgnoredChannels(guildId);
      if (ignored.length === 0) {
        await interaction.reply({ content: `ℹ️ No ignored channels in **${guild.name}**.`, flags: MessageFlags.Ephemeral });
      } else {
        const list = ignored.map(id => {
          const ch = guild.channels.cache.get(id);
          return `• ${ch ? ch.name : id} (${id})`;
        }).join('\n');
        await interaction.reply({ content: `**Ignored channels in ${guild.name}:**\n${list}`, flags: MessageFlags.Ephemeral });
      }
    }
  },
};