const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    if (!channel.guild) return;
    const config = guildConfig.get(channel.guild.id);
    if (!config?.logChannel || !config.logEvents?.channelCreate) return;

    const logChannel = channel.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📁 Channel Created')
      .setDescription(`**Name:** ${channel.name}\n**Type:** ${channel.type}\n**ID:** ${channel.id}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};