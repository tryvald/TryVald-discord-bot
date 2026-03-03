const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const ownerConfig = require('../utils/ownerConfig');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore DMs (only listen in servers)
    if (!message.guild) return;

    // Check if this server is being listened to
    if (!ownerConfig.isListening(message.guild.id)) return;

    const owner = await message.client.users.fetch(config.ownerId).catch(() => null);
    if (!owner) return;

    // Create a rich embed for the forwarded message
    const embed = new EmbedBuilder()
      .setColor('Random')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setDescription(message.content || '*No content*')
      .addFields(
        { name: 'Server', value: message.guild.name, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Jump', value: `[Click](${message.url})`, inline: true }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp(message.createdAt); // Original message timestamp

    try {
      await owner.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send DM to owner:', error);
    }
  },
};