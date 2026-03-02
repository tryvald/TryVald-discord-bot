const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    // Ignore DMs and bots
    if (!message.guild || message.author?.bot) return;

    const config = guildConfig.get(message.guild.id);
    if (!config?.logChannel || !config.logEvents?.messageDelete) return;

    const logChannel = message.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🗑️ Message Deleted')
      .setDescription(`**Author:** ${message.author.tag} (${message.author.id})\n**Channel:** ${message.channel}`)
      .addFields(
        { name: 'Content', value: message.content ? message.content.slice(0, 1024) : '*No content*' }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};