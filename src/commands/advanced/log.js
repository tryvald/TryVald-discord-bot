const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

// Define all available log events with descriptions
const AVAILABLE_EVENTS = {
  messageDelete: 'When a message is deleted',
  messageUpdate: 'When a message is edited',
  guildMemberAdd: 'When a member joins',
  guildMemberRemove: 'When a member leaves',
  guildMemberUpdate: 'When member nickname/roles change',
  channelCreate: 'When a channel is created',
  channelDelete: 'When a channel is deleted',
  channelUpdate: 'When a channel is updated',
  roleCreate: 'When a role is created',
  roleDelete: 'When a role is deleted',
  roleUpdate: 'When a role is updated',
  inviteCreate: 'When an invite is created',
  voiceStateUpdate: 'When a member joins/leaves/moves in voice',
  messageBulkDelete: 'When messages are bulk‑deleted',
  interactionCreate: 'When a slash command is used (optional)'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Configure server logging.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the channel where logs will be sent.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The text channel for logs')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable a specific log event.')
        .addStringOption(opt =>
          opt.setName('event')
            .setDescription('The event to toggle')
            .setRequired(true)
            .addChoices(
              ...Object.entries(AVAILABLE_EVENTS).map(([value, name]) => ({ name, value }))
            )))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show current log settings.'))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable all logging (remove log channel).')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const current = guildConfig.get(guildId) || {};

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      // Save channel ID
      guildConfig.set(guildId, 'logChannel', channel.id);
      // Ensure logEvents object exists
      if (!current.logEvents) {
        guildConfig.set(guildId, 'logEvents', {});
      }
      await interaction.reply({ content: `✅ Log channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'toggle') {
      const eventKey = interaction.options.getString('event');
      if (!current.logChannel) {
        return interaction.reply({ content: '❌ Please set a log channel first using `/log channel`.', flags: MessageFlags.Ephemeral });
      }
      // Get current events object
      const events = current.logEvents || {};
      const newState = !events[eventKey]; // toggle
      events[eventKey] = newState;
      guildConfig.set(guildId, 'logEvents', events);
      await interaction.reply({
        content: `✅ Event **${eventKey}** is now ${newState ? 'enabled' : 'disabled'}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    else if (sub === 'list') {
      if (!current.logChannel) {
        return interaction.reply({ content: '❌ Logging is not configured. Use `/log channel` first.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.guild.channels.cache.get(current.logChannel);
      const events = current.logEvents || {};
      const enabled = Object.entries(events)
        .filter(([, val]) => val)
        .map(([key]) => `• \`${key}\` – ${AVAILABLE_EVENTS[key] || 'No description'}`);
      const disabled = Object.keys(AVAILABLE_EVENTS)
        .filter(key => !events[key])
        .map(key => `• \`${key}\``);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('📋 Log Configuration')
        .addFields(
          { name: 'Channel', value: channel ? `${channel}` : 'Unknown', inline: false },
          { name: 'Enabled Events', value: enabled.length ? enabled.join('\n') : 'None', inline: true },
          { name: 'Disabled Events', value: disabled.length ? disabled.join('\n') : 'None', inline: true }
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'disable') {
      guildConfig.set(guildId, 'logChannel', null);
      guildConfig.set(guildId, 'logEvents', {});
      await interaction.reply({ content: '✅ Logging disabled. Log channel removed.', flags: MessageFlags.Ephemeral });
    }
  },
};