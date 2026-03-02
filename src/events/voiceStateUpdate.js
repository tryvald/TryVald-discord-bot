const { EmbedBuilder, Events } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member?.guild) return;

    const config = guildConfig.get(member.guild.id);
    if (!config?.logChannel || !config.logEvents?.voiceStateUpdate) return;

    const logChannel = member.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    let action = '';
    if (!oldState.channelId && newState.channelId) action = 'joined voice';
    else if (oldState.channelId && !newState.channelId) action = 'left voice';
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) action = 'moved voice';
    else return;

    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle('🔊 Voice State Update')
      .setDescription(`${member.user.tag} ${action}`)
      .addFields(
        { name: 'From', value: oldState.channel ? `<#${oldState.channelId}>` : 'None', inline: true },
        { name: 'To', value: newState.channel ? `<#${newState.channelId}>` : 'None', inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
  },
};