const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.RoleUpdate,
  async execute(oldRole, newRole) {
    if (!oldRole.guild) return;
    const config = guildConfig.get(oldRole.guild.id);
    if (!config?.logChannel || !config.logEvents?.roleUpdate) return;

    const logChannel = oldRole.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`Name: **${oldRole.name}** → **${newRole.name}**`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('Yellow')
      .setTitle('🎭 Role Updated')
      .setDescription(`Role: ${newRole}\n` + changes.join('\n'))
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};