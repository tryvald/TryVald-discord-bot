const { Events, EmbedBuilder } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user.bot) return;

    const config = guildConfig.get(member.guild.id);
    if (!config?.goodbye?.enabled) return;
    if (!config.goodbye.channelId) return;

    const channel = member.guild.channels.cache.get(config.goodbye.channelId);
    if (!channel) return;

    const memberCount = member.guild.members.cache.filter(m => !m.user.bot).size;

    const embed = generateEmbed(config.goodbye.embed, member.user, member.guild, memberCount);

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send goodbye message:', error);
    }
  },
};

// Same helper (could be extracted to avoid duplication)
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
    .setColor(embedData.color || '#FF0000')
    .setTimestamp();

  if (embedData.footer) embed.setFooter({ text: replace(embedData.footer) });
  if (embedData.image) embed.setImage(embedData.image);

  return embed;
}