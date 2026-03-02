const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    if (!invite.guild) return;
    const config = guildConfig.get(invite.guild.id);
    if (!config?.logChannel || !config.logEvents?.inviteCreate) return;

    const logChannel = invite.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📨 Invite Created')
      .setDescription(`**Code:** ${invite.code}\n**Channel:** ${invite.channel}\n**Max Uses:** ${invite.maxUses || 'Unlimited'}\n**Expires:** ${invite.maxAge ? `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>` : 'Never'}`)
      .setFooter({ text: `Created by ${invite.inviter?.tag || 'Unknown'}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};