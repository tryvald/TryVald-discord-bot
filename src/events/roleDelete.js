const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.RoleDelete,
  async execute(role) {
    if (!role.guild) return;
    const config = guildConfig.get(role.guild.id);
    if (!config?.logChannel || !config.logEvents?.roleDelete) return;

    const logChannel = role.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🎭 Role Deleted')
      .setDescription(`**Name:** ${role.name}\n**ID:** ${role.id}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};