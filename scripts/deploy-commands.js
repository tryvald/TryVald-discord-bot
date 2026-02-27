const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/config');

const commands = [];
const commandsPath = path.join(__dirname, '../src/commands');
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if ('data' in command) commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  try {
    console.log("Refreshing  commands...");
    const data = await rest.put(
      config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    console.log(`✅ Reloaded ${data.length} commands.`);
  } catch (error) { console.error(error); }
})();
