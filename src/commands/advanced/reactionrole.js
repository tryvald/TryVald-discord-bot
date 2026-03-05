const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

function parseEmoji(emojiString) {
  if (!emojiString) return null;
  const customMatch = emojiString.match(/^<a?:(\w+):(\d+)>$/);
  if (customMatch) {
    return { id: customMatch[2], name: customMatch[1], animated: emojiString.startsWith('<a:') };
  }
  return { name: emojiString };
}

function buildButtons(roles, messageId) {
  const rows = [];
  let currentRow = new ActionRowBuilder();
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const button = new ButtonBuilder()
      .setCustomId(`rr_${messageId}_${i}`)
      .setLabel(role.label)
      .setStyle(ButtonStyle.Primary);
    if (role.emoji) {
      if (role.emoji.id) {
        button.setEmoji({ id: role.emoji.id, name: role.emoji.name, animated: role.emoji.animated });
      } else {
        button.setEmoji(role.emoji.name);
      }
    }
    currentRow.addComponents(button);
    if (currentRow.components.length === 5 || i === roles.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  }
  return rows;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction role panels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Quick create (up to 6 roles)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a reaction role panel (quick setup, up to 6 roles).')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send the panel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Embed title')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Embed description')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('color')
            .setDescription('Embed color (hex, e.g., #FF0000)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('image')
            .setDescription('Image URL')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('footer')
            .setDescription('Footer text')
            .setRequired(false))
        .addIntegerOption(opt =>
          opt.setName('max_selections')
            .setDescription('Maximum roles a user can have (0 = unlimited, 1 = single)')
            .setRequired(false)
            .setMinValue(0))
        // Role 1
        .addRoleOption(opt => opt.setName('role1').setDescription('Role 1').setRequired(false))
        .addStringOption(opt => opt.setName('label1').setDescription('Button label for role 1').setRequired(false))
        .addStringOption(opt => opt.setName('emoji1').setDescription('Emoji for role 1').setRequired(false))
        // Role 2
        .addRoleOption(opt => opt.setName('role2').setDescription('Role 2').setRequired(false))
        .addStringOption(opt => opt.setName('label2').setDescription('Button label for role 2').setRequired(false))
        .addStringOption(opt => opt.setName('emoji2').setDescription('Emoji for role 2').setRequired(false))
        // Role 3
        .addRoleOption(opt => opt.setName('role3').setDescription('Role 3').setRequired(false))
        .addStringOption(opt => opt.setName('label3').setDescription('Button label for role 3').setRequired(false))
        .addStringOption(opt => opt.setName('emoji3').setDescription('Emoji for role 3').setRequired(false))
        // Role 4
        .addRoleOption(opt => opt.setName('role4').setDescription('Role 4').setRequired(false))
        .addStringOption(opt => opt.setName('label4').setDescription('Button label for role 4').setRequired(false))
        .addStringOption(opt => opt.setName('emoji4').setDescription('Emoji for role 4').setRequired(false))
        // Role 5
        .addRoleOption(opt => opt.setName('role5').setDescription('Role 5').setRequired(false))
        .addStringOption(opt => opt.setName('label5').setDescription('Button label for role 5').setRequired(false))
        .addStringOption(opt => opt.setName('emoji5').setDescription('Emoji for role 5').setRequired(false))
        // Role 6
        .addRoleOption(opt => opt.setName('role6').setDescription('Role 6').setRequired(false))
        .addStringOption(opt => opt.setName('label6').setDescription('Button label for role 6').setRequired(false))
        .addStringOption(opt => opt.setName('emoji6').setDescription('Emoji for role 6').setRequired(false)))
    // Delete
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a reaction role panel by message ID.')
        .addStringOption(opt =>
          opt.setName('message_id')
            .setDescription('The ID of the panel message')
            .setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let config = guildConfig.get(guildId) || {};
    if (!config.reactionPanels) config.reactionPanels = {};

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || '#3498db';
      const image = interaction.options.getString('image');
      const footer = interaction.options.getString('footer');
      const maxSelections = interaction.options.getInteger('max_selections') ?? 0;

      const roles = [];
      for (let i = 1; i <= 6; i++) {
        const role = interaction.options.getRole(`role${i}`);
        const label = interaction.options.getString(`label${i}`);
        const emojiStr = interaction.options.getString(`emoji${i}`);
        if (role && label) {
          if (!interaction.guild.members.me.roles.highest.comparePositionTo(role) > 0) {
            return interaction.reply({ content: `❌ I cannot assign role ${role} (it's higher than my highest role).`, flags: MessageFlags.Ephemeral });
          }
          const emoji = emojiStr ? parseEmoji(emojiStr) : null;
          roles.push({ roleId: role.id, label, emoji });
        }
      }

      if (roles.length === 0) {
        return interaction.reply({ content: '❌ You must provide at least one role with a label.', flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
      if (image) embed.setImage(image);
      if (footer) embed.setFooter({ text: footer });

      const message = await channel.send({ embeds: [embed], components: [] });
      const panelId = message.id;
      const rows = buildButtons(roles, panelId);
      await message.edit({ components: rows });

      config.reactionPanels[panelId] = {
        channelId: channel.id,
        title,
        description,
        color,
        image,
        footer,
        maxSelections,
        roles: roles.map((r, idx) => ({ ...r, index: idx })),
      };
      guildConfig.set(guildId, 'reactionPanels', config.reactionPanels);

      await interaction.reply({ content: `✅ Reaction panel created in ${channel}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'delete') {
      const messageId = interaction.options.getString('message_id');
      if (!config.reactionPanels[messageId]) {
        return interaction.reply({ content: '❌ No panel found with that message ID.', flags: MessageFlags.Ephemeral });
      }
      const panel = config.reactionPanels[messageId];
      const channel = interaction.guild.channels.cache.get(panel.channelId);
      if (channel) {
        try {
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
        } catch (e) {}
      }
      delete config.reactionPanels[messageId];
      guildConfig.set(guildId, 'reactionPanels', config.reactionPanels);
      await interaction.reply({ content: '✅ Panel deleted.', flags: MessageFlags.Ephemeral });
    }
  },
};