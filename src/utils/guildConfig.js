const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/guildConfig.json');

function readConfig() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  get(guildId) {
    const data = readConfig();
    return data[guildId] || {};
  },
  set(guildId, key, value) {
    const data = readConfig();
    if (!data[guildId]) data[guildId] = {};
    data[guildId][key] = value;
    writeConfig(data);
  },
  delete(guildId, key) {
    const data = readConfig();
    if (data[guildId] && key in data[guildId]) {
      delete data[guildId][key];
      writeConfig(data);
      return true;
    }
    return false;
  },
  // ✅ Add this new method
  getAll() {
    return readConfig();
  }
};