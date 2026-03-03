const { Events } = require('discord.js');
const config = require('../config');
const ownerConfig = require('../utils/ownerConfig');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore DMs and bot messages
    if (!message.guild || message.author.bot) return;

    if (!ownerConfig.isListening(message.guild.id)) return;

    const owner = await message.client.users.fetch(config.ownerId).catch(() => null);
    if (!owner) return;

    const content = `**${message.guild.name}** | #${message.channel.name}\n**${message.author.tag}**: ${message.content}`;

    try {
      await owner.send(content);
    } catch (error) {
      console.error('Failed to send DM to owner:', error);
    }
  },
};