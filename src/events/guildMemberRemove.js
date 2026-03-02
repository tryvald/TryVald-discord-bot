const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member.guild) return;

    const config = guildConfig.get(member.guild.id);
    if (!config?.logChannel || !config.logEvents?.guildMemberRemove) return;

    const logChannel = member.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('❌ Member Left')
      .setDescription(`${member.user.tag} (${member.id})`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : 'Unknown', inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};