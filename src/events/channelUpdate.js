const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    if (!oldChannel.guild) return;
    const config = guildConfig.get(oldChannel.guild.id);
    if (!config?.logChannel || !config.logEvents?.channelUpdate) return;

    const logChannel = oldChannel.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Name: **${oldChannel.name}** → **${newChannel.name}**`);
    if (oldChannel.topic !== newChannel.topic) changes.push(`Topic: ${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('Yellow')
      .setTitle('📁 Channel Updated')
      .setDescription(`Channel: ${newChannel}\n` + changes.join('\n'))
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};