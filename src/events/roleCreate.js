const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.RoleCreate,
  async execute(role) {
    if (!role.guild) return;
    const config = guildConfig.get(role.guild.id);
    if (!config?.logChannel || !config.logEvents?.roleCreate) return;

    const logChannel = role.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🎭 Role Created')
      .setDescription(`**Name:** ${role.name}\n**Color:** ${role.hexColor}\n**ID:** ${role.id}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};