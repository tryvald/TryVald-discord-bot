const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // ─────────────────────────────────────────────────────────────
    // 1. REACTION ROLE BUTTONS (only in guilds)
    // ─────────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('rr_')) {
      if (!interaction.guild) return; // safety check

      const [_, messageId, indexStr] = interaction.customId.split('_');
      const index = parseInt(indexStr, 10);
      const guildId = interaction.guild.id;
      const guildData = guildConfig.get(guildId) || {};

      if (!guildData.reactionPanels?.[messageId]) {
        return interaction.reply({ content: 'This panel is no longer active.', ephemeral: true });
      }

      const panel = guildData.reactionPanels[messageId];
      const roleData = panel.roles[index];
      if (!roleData) return;

      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(roleData.roleId);
      if (!role) {
        return interaction.reply({ content: 'The role for this button no longer exists.', ephemeral: true });
      }

      const hasRole = member.roles.cache.has(role.id);

      // Enforce maxSelections if set
      if (panel.maxSelections > 0 && !hasRole) {
        const userRoles = member.roles.cache.filter(r => panel.roles.some(p => p.roleId === r.id)).size;
        if (userRoles >= panel.maxSelections) {
          return interaction.reply({ content: `You can only have up to ${panel.maxSelections} role(s) from this panel.`, ephemeral: true });
        }
      }

      try {
        if (hasRole) {
          await member.roles.remove(role, 'Reaction role removed');
          await interaction.reply({ content: `Removed role **${role.name}**.`, ephemeral: true });
        } else {
          await member.roles.add(role, 'Reaction role added');
          await interaction.reply({ content: `Added role **${role.name}**.`, ephemeral: true });
        }
      } catch (error) {
        logger.error('Error toggling reaction role:', error);
        await interaction.reply({ content: 'Failed to update role. Check permissions.', ephemeral: true });
      }
      return; // stop further processing
    }

    // ─────────────────────────────────────────────────────────────
    // 2. LOGGING FOR ALL INTERACTIONS
    // ─────────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      logger.info(`[COMMAND] ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
    } else if (interaction.isButton()) {
      logger.debug(`[BUTTON] ${interaction.user.tag} clicked ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
    } else if (interaction.isModalSubmit()) {
      logger.debug(`[MODAL] ${interaction.user.tag} submitted modal ${interaction.customId}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SLASH COMMAND EXECUTION
    // ─────────────────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing /${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      }
    }
  },
};