const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel.guild) return;
    const config = guildConfig.get(channel.guild.id);
    if (!config?.logChannel || !config.logEvents?.channelDelete) return;

    const logChannel = channel.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('📁 Channel Deleted')
      .setDescription(`**Name:** ${channel.name}\n**Type:** ${channel.type}\n**ID:** ${channel.id}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};