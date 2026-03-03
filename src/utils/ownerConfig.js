const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/ownerConfig.json');

function readConfig() {
  if (!fs.existsSync(filePath)) return { listeningGuilds: [] };
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { listeningGuilds: [] };
  }
}

function writeConfig(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  getListeningGuilds() {
    return readConfig().listeningGuilds || [];
  },
  addListeningGuild(guildId) {
    const data = readConfig();
    if (!data.listeningGuilds) data.listeningGuilds = [];
    if (!data.listeningGuilds.includes(guildId)) {
      data.listeningGuilds.push(guildId);
      writeConfig(data);
      return true;
    }
    return false;
  },
  removeListeningGuild(guildId) {
    const data = readConfig();
    if (!data.listeningGuilds) return false;
    const index = data.listeningGuilds.indexOf(guildId);
    if (index !== -1) {
      data.listeningGuilds.splice(index, 1);
      writeConfig(data);
      return true;
    }
    return false;
  },
  isListening(guildId) {
    return this.getListeningGuilds().includes(guildId);
  }
};