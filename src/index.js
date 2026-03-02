const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

// ✅ Include all necessary intents for logging and moderation features
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,                // Required for basic guild info (channels, roles) - ALREADY HAD
    GatewayIntentBits.GuildMessages,          // ✅ Required for message events (delete, update, bulk delete)
    GatewayIntentBits.MessageContent,          // ✅ Required to READ message content (for messageUpdate logs)
    GatewayIntentBits.GuildMembers,            // ✅ Required for member join/leave/update events
    GatewayIntentBits.GuildVoiceStates,        // ✅ Required for voice state update logs (if you ever add them)
    GatewayIntentBits.GuildMessageReactions,   // ✅ Optional: if you want to log reactions (future use)
    GatewayIntentBits.GuildModeration,          // ✅ Optional: for audit log events (if you expand logging)
    // Add GatewayIntentBits.GuildPresences if you ever need member status updates (privileged intent)
  ]
});

client.commands = new Collection();

// Load commands (your existing code remains perfect)
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

// Load events (your existing code remains perfect)
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

client.login(config.token);