const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    // Ignore if content didn't change (e.g., embed update)
    if (oldMessage.content === newMessage.content) return;

    const config = guildConfig.get(newMessage.guild.id);
    if (!config?.logChannel || !config.logEvents?.messageUpdate) return;

    const logChannel = newMessage.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Yellow')
      .setTitle('✏️ Message Edited')
      .setDescription(`**Author:** ${newMessage.author.tag} (${newMessage.author.id})\n**Channel:** ${newMessage.channel} [Jump](${newMessage.url})`)
      .addFields(
        { name: 'Before', value: oldMessage.content ? oldMessage.content.slice(0, 1024) : '*No content*' },
        { name: 'After', value: newMessage.content ? newMessage.content.slice(0, 1024) : '*No content*' }
      )
      .setFooter({ text: `Message ID: ${newMessage.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};