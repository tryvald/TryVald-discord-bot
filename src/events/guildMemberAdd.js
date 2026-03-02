const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!member.guild) return;

    const config = guildConfig.get(member.guild.id);
    if (!config?.logChannel || !config.logEvents?.guildMemberAdd) return;

    const logChannel = member.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Member Joined')
      .setDescription(`${member.user.tag} (${member.id})`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};