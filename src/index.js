const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const guildConfig = require('./utils/guildConfig'); // Required for lock persistence

// ✅ All necessary intents for logging, moderation, and locking
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,                // Basic guild info
    GatewayIntentBits.GuildMessages,          // Message events (delete, update, bulk delete)
    GatewayIntentBits.MessageContent,         // Read message content for logs
    GatewayIntentBits.GuildMembers,           // Member join/leave/update
    GatewayIntentBits.GuildVoiceStates,       // Voice state updates
    GatewayIntentBits.GuildMessageReactions,  // Future reaction logs
    GatewayIntentBits.GuildModeration,        // Future audit log events
  ]
});

client.commands = new Collection();

// ─────────────────────────────────────────────────────────────
// Helper function to unlock a channel (used by auto‑unlock)
async function unlockChannel(guildId, channelId, reason = 'Auto‑unlock (duration expired)') {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;
    const channel = await guild.channels.fetch(channelId);
    if (!channel) return;

    // Remove the @everyone SendMessages overwrite
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: null
    }, { reason });

    // Remove from config
    const configData = guildConfig.get(guildId) || {};
    if (configData.lockedChannels && configData.lockedChannels[channelId]) {
      delete configData.lockedChannels[channelId];
      guildConfig.set(guildId, 'lockedChannels', configData.lockedChannels);
    }

    // Optional: send an unlock message in the channel
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🔓 Channel Unlocked')
      .setDescription(`This channel has been automatically unlocked.`)
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error(`❌ Failed to auto‑unlock channel ${channelId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────
// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    command.category = folder;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// ─────────────────────────────────────────────────────────────
// Restore scheduled unlocks from previous sessions
const allGuildConfigs = guildConfig.getAll(); // Requires getAll() method in guildConfig.js
const now = Date.now();

for (const [guildId, guildData] of Object.entries(allGuildConfigs)) {
  if (guildData.lockedChannels) {
    for (const [channelId, lockInfo] of Object.entries(guildData.lockedChannels)) {
      // If there's a lockedUntil timestamp and it's in the future
      if (lockInfo.lockedUntil && lockInfo.lockedUntil > now) {
        const delay = lockInfo.lockedUntil - now;
        setTimeout(() => {
          unlockChannel(guildId, channelId, 'Auto‑unlock (duration expired)');
        }, delay);
        console.log(`⏰ Scheduled unlock for channel ${channelId} in ${Math.round(delay / 1000 / 60)} minutes.`);
      }
      // If it's already passed, unlock immediately
      else if (lockInfo.lockedUntil && lockInfo.lockedUntil <= now) {
        unlockChannel(guildId, channelId, 'Auto‑unlock (duration expired)');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Log in
client.login(config.token);