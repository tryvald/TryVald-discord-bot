const { Events, EmbedBuilder } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.user.bot) return; // ignore bots

    const config = guildConfig.get(member.guild.id);
    if (!config?.welcome?.enabled) return;
    if (!config.welcome.channelId) return;

    const channel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!channel) return;

    // Count members excluding bots
    const memberCount = member.guild.members.cache.filter(m => !m.user.bot).size;

    // Generate embed using the member
    const embed = generateEmbed(config.welcome.embed, member.user, member.guild, memberCount);

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send welcome message:', error);
    }
  },
};

// Helper function (same as before, could be placed in a shared file)
function generateEmbed(embedData, user, guild, memberCount) {
  const replace = (text) => {
    if (!text) return text;
    return text
      .replace(/{user}/g, `<@${user.id}>`)
      .replace(/{user\.name}/g, user.displayName)
      .replace(/{server}/g, guild.name)
      .replace(/{memberCount}/g, memberCount);
  };

  const embed = new EmbedBuilder()
    .setTitle(replace(embedData.title))
    .setDescription(replace(embedData.description))
    .setColor(embedData.color || '#00FF00')
    .setTimestamp();

  if (embedData.footer) embed.setFooter({ text: replace(embedData.footer) });
  if (embedData.image) embed.setImage(embedData.image);

  return embed;
}