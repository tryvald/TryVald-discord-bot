const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');
const scheduler = require('../../utils/scheduler');

// Helper to generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Helper to convert 12-hour time to 24-hour for cron
function convertTo24Hour(hour, minute, ampm) {
  let hour24 = hour;
  if (ampm === 'PM' && hour !== 12) hour24 += 12;
  if (ampm === 'AM' && hour === 12) hour24 = 0;
  return { minute, hour: hour24 };
}

// Helper to get day of week number (0=Sunday, 6=Saturday) for cron
function dayToCronDay(day) {
  const days = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
  return days[day.toLowerCase()];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Manage scheduled messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // ───────────────────────────── ADD ─────────────────────────────
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a new scheduled message.')
        // Required options first
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send the message')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('frequency')
            .setDescription('How often to send')
            .setRequired(true)
            .addChoices(
              { name: 'Once', value: 'once' },
              { name: 'Daily', value: 'daily' },
              { name: 'Weekly', value: 'weekly' }
            ))
        .addIntegerOption(opt =>
          opt.setName('hour')
            .setDescription('Hour (1-12)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12))
        .addIntegerOption(opt =>
          opt.setName('minute')
            .setDescription('Minute (0-59)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(59))
        .addStringOption(opt =>
          opt.setName('ampm')
            .setDescription('AM or PM')
            .setRequired(true)
            .addChoices(
              { name: 'AM', value: 'AM' },
              { name: 'PM', value: 'PM' }
            ))
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Message text')
            .setRequired(true))
        // Optional options after all required
        .addStringOption(opt =>
          opt.setName('date')
            .setDescription('Date for once (YYYY-MM-DD, e.g. 2025-12-25)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('day')
            .setDescription('Day of week (required if weekly)')
            .setRequired(false)
            .addChoices(
              { name: 'Sunday', value: 'sunday' },
              { name: 'Monday', value: 'monday' },
              { name: 'Tuesday', value: 'tuesday' },
              { name: 'Wednesday', value: 'wednesday' },
              { name: 'Thursday', value: 'thursday' },
              { name: 'Friday', value: 'friday' },
              { name: 'Saturday', value: 'saturday' }
            ))
        .addStringOption(opt =>
          opt.setName('embed_title')
            .setDescription('Embed title (optional)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('embed_description')
            .setDescription('Embed description (optional)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('embed_color')
            .setDescription('Embed color (hex, e.g. #FF0000)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('embed_image')
            .setDescription('Image URL')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('embed_footer')
            .setDescription('Footer text')
            .setRequired(false)))
    // ───────────────────────────── LIST ─────────────────────────────
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all scheduled messages in this server.'))
    // ───────────────────────────── REMOVE ─────────────────────────────
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a scheduled message by ID.')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('The ID of the scheduled message')
            .setRequired(true)))
    // ───────────────────────────── ENABLE ─────────────────────────────
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable a scheduled message.')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('The ID of the scheduled message')
            .setRequired(true)))
    // ───────────────────────────── DISABLE ─────────────────────────────
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable a scheduled message.')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('The ID of the scheduled message')
            .setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const config = guildConfig.get(guildId) || {};

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const frequency = interaction.options.getString('frequency');
      const dateStr = interaction.options.getString('date');
      const hour = interaction.options.getInteger('hour');
      const minute = interaction.options.getInteger('minute');
      const ampm = interaction.options.getString('ampm');
      const day = interaction.options.getString('day');
      const messageText = interaction.options.getString('message');
      const embedTitle = interaction.options.getString('embed_title');
      const embedDesc = interaction.options.getString('embed_description');
      const embedColor = interaction.options.getString('embed_color');
      const embedImage = interaction.options.getString('embed_image');
      const embedFooter = interaction.options.getString('embed_footer');

      // Validation
      if (frequency === 'once' && !dateStr) {
        return interaction.reply({ content: '❌ Date is required for one‑time schedule.', flags: MessageFlags.Ephemeral });
      }
      if (frequency === 'weekly' && !day) {
        return interaction.reply({ content: '❌ Day of week is required for weekly schedule.', flags: MessageFlags.Ephemeral });
      }

      // Convert time to 24-hour
      const { minute: cronMin, hour: cronHour } = convertTo24Hour(hour, minute, ampm);

      let cronExpr = null;
      let scheduledTime = null;

      if (frequency === 'once') {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
          return interaction.reply({ content: '❌ Invalid date format. Use YYYY-MM-DD (e.g., 2025-12-25).', flags: MessageFlags.Ephemeral });
        }
        // Build ISO string (UTC)
        scheduledTime = `${dateStr}T${cronHour.toString().padStart(2,'0')}:${cronMin.toString().padStart(2,'0')}:00.000Z`;
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate <= new Date()) {
          return interaction.reply({ content: '❌ Scheduled time must be in the future.', flags: MessageFlags.Ephemeral });
        }
      } else if (frequency === 'daily') {
        cronExpr = `${cronMin} ${cronHour} * * *`;
      } else if (frequency === 'weekly') {
        const cronDay = dayToCronDay(day);
        cronExpr = `${cronMin} ${cronHour} * * ${cronDay}`;
      }

      // Build embed data
      const embedData = {};
      if (embedTitle) embedData.title = embedTitle;
      if (embedDesc) embedData.description = embedDesc; // optional extra description? We'll store it.
      if (embedColor) embedData.color = embedColor;
      if (embedImage) embedData.image = embedImage;
      if (embedFooter) embedData.footer = embedFooter;

      const jobId = generateId();
      const job = {
        id: jobId,
        channelId: channel.id,
        type: frequency,
        messageText,
        embedData,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      if (frequency === 'once') {
        job.scheduledTime = scheduledTime;
      } else {
        job.cron = cronExpr;
      }

      // Save and schedule
      if (!config.scheduledMessages) config.scheduledMessages = [];
      config.scheduledMessages.push(job);
      guildConfig.set(guildId, 'scheduledMessages', config.scheduledMessages);
      scheduler.addJob(interaction.client, guildId, job);

      await interaction.reply({ content: `✅ Scheduled message added with ID: \`${jobId}\``, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'list') {
      const jobs = config.scheduledMessages || [];
      if (jobs.length === 0) {
        return interaction.reply({ content: 'ℹ️ No scheduled messages in this server.', flags: MessageFlags.Ephemeral });
      }
      const jobList = jobs.map(j => {
        const timeStr = j.type === 'once'
          ? `<t:${Math.floor(new Date(j.scheduledTime).getTime() / 1000)}:F>`
          : `\`${j.cron}\` (${j.type})`;
        return `**${j.id}** – ${timeStr} – ${j.enabled ? '✅ Enabled' : '❌ Disabled'}`;
      }).join('\n');
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('📋 Scheduled Messages')
        .setDescription(jobList);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'remove') {
      const jobId = interaction.options.getString('id');
      if (!config.scheduledMessages || !config.scheduledMessages.find(j => j.id === jobId)) {
        return interaction.reply({ content: '❌ No scheduled message with that ID.', flags: MessageFlags.Ephemeral });
      }
      scheduler.removeJob(interaction.client, guildId, jobId);
      await interaction.reply({ content: `✅ Removed scheduled message \`${jobId}\`.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'enable') {
      const jobId = interaction.options.getString('id');
      const job = config.scheduledMessages?.find(j => j.id === jobId);
      if (!job) {
        return interaction.reply({ content: '❌ No scheduled message with that ID.', flags: MessageFlags.Ephemeral });
      }
      if (job.enabled) {
        return interaction.reply({ content: 'ℹ️ That job is already enabled.', flags: MessageFlags.Ephemeral });
      }
      scheduler.toggleJob(interaction.client, guildId, jobId, true);
      await interaction.reply({ content: `✅ Enabled scheduled message \`${jobId}\`.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'disable') {
      const jobId = interaction.options.getString('id');
      const job = config.scheduledMessages?.find(j => j.id === jobId);
      if (!job) {
        return interaction.reply({ content: '❌ No scheduled message with that ID.', flags: MessageFlags.Ephemeral });
      }
      if (!job.enabled) {
        return interaction.reply({ content: 'ℹ️ That job is already disabled.', flags: MessageFlags.Ephemeral });
      }
      scheduler.toggleJob(interaction.client, guildId, jobId, false);
      await interaction.reply({ content: `✅ Disabled scheduled message \`${jobId}\`.`, flags: MessageFlags.Ephemeral });
    }
  },
};