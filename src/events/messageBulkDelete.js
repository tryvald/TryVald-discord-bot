const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages, channel) {
    const guild = channel.guild;
    if (!guild) return;

    const config = guildConfig.get(guild.id);
    if (!config?.logChannel || !config.logEvents?.messageBulkDelete) return;

    const logChannel = guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🗑️ Bulk Messages Deleted')
      .setDescription(`**${messages.size} messages** deleted in ${channel}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};