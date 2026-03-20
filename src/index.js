const scheduler = require('./utils/scheduler');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const guildConfig = require('./utils/guildConfig');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ]
});

client.commands = new Collection();
client.voiceConnections = new Map();  // ✅ Add this line for voice connections

// Helper function to unlock a channel (unchanged)
async function unlockChannel(guildId, channelId, reason = 'Auto‑unlock (duration expired)') {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;
    const channel = await guild.channels.fetch(channelId);
    if (!channel) return;
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason });
    const configData = guildConfig.get(guildId) || {};
    if (configData.lockedChannels && configData.lockedChannels[channelId]) {
      delete configData.lockedChannels[channelId];
      guildConfig.set(guildId, 'lockedChannels', configData.lockedChannels);
    }
    logger.info(`Auto‑unlocked channel ${channelId} in guild ${guildId}`);
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🔓 Channel Unlocked')
      .setDescription(`This channel has been automatically unlocked.`)
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    logger.error(`Failed to auto‑unlock channel ${channelId}:`, error);
  }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
logger.info(`Loading commands from ${commandsPath}`);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    command.category = folder;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name} (category: ${folder})`);
    } else {
      logger.warn(`Command at ${filePath} missing required properties`);
    }
  }
}
logger.info(`Loaded ${client.commands.size} commands`);

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
logger.info(`Loading events from ${eventsPath}`);
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
    logger.debug(`Loaded once event: ${event.name}`);
  } else {
    client.on(event.name, (...args) => event.execute(...args));
    logger.debug(`Loaded on event: ${event.name}`);
  }
}
logger.info(`Loaded ${eventFiles.length} event handlers`);

// Restore scheduled unlocks
const allGuildConfigs = guildConfig.getAll();
const now = Date.now();
let scheduledCount = 0;
for (const [guildId, guildData] of Object.entries(allGuildConfigs)) {
  if (guildData.lockedChannels) {
    for (const [channelId, lockInfo] of Object.entries(guildData.lockedChannels)) {
      if (lockInfo.lockedUntil && lockInfo.lockedUntil > now) {
        const delay = lockInfo.lockedUntil - now;
        setTimeout(() => {
          unlockChannel(guildId, channelId, 'Auto‑unlock (duration expired)');
        }, delay);
        scheduledCount++;
        logger.debug(`Scheduled unlock for channel ${channelId} in ${Math.round(delay / 1000 / 60)} minutes`);
      } else if (lockInfo.lockedUntil && lockInfo.lockedUntil <= now) {
        unlockChannel(guildId, channelId, 'Auto‑unlock (duration expired)');
      }
    }
  }
}
logger.info(`Restored ${scheduledCount} scheduled unlocks`);

// Bot ready event
client.once('ready', () => {
  logger.info(`✅ Logged in as ${client.user.tag} (ID: ${client.user.id})`);
  logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
});

// Error handlers
client.on('error', (error) => {
  logger.error('Client error:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

// Load scheduled messages
scheduler.loadAllSchedules(client);

// Login
client.login(config.token).catch(error => {
  logger.error('Failed to login:', error);
});