const { SlashCommandBuilder, EmbedBuilder, codeBlock } = require('discord.js');
const util = require('util');
const config = require('../../config');
const vm = require('vm'); // ← consider switching to vm for better isolation

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Execute JS code (owner only)')
    .setDMPermission(false)
    .addStringOption(opt => opt.setName('message_id').setDescription('Message ID with code block').setRequired(true)),

  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: 'Owner only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('message_id');
    let message;
    try {
      message = await interaction.channel.messages.fetch(messageId);
    } catch {
      return interaction.editReply('Could not fetch message. Wrong ID or not in this channel?');
    }

    // Better code extraction
    const codeMatch = message.content.match(/```(?:js|javascript)?\n?([\s\S]*?)\n?```/i);
    const code = codeMatch?.[1]?.trim() || message.content.trim();
    if (!code) return interaction.editReply('No code found in that message.');

    // Optional: simple dangerous keyword check
    const dangerous = ['process.exit', 'fs.', 'child_process', 'token', 'DISCORD_TOKEN'];
    if (dangerous.some(d => code.toLowerCase().includes(d))) {
      return interaction.editReply('Dangerous keywords detected. Aborted.');
    }

    const logs = [];
    const originals = {};
    ['log','error','warn','info','debug','trace','dir','table'].forEach(m => {
      originals[m] = console[m];
      console[m] = (...args) => logs.push(`${m.toUpperCase()}: ${args.map(a => util.inspect(a, { depth: 3, colors: false })).join(' ')}`);
    });

    let result, error = null;
    try {
      // Option A: keep Function (current)
      const fn = new Function('interaction', 'client', 'console', `return (async () => { ${code} })();`);
      result = await fn(interaction, interaction.client, console); // pass useful context

      // Option B: safer vm context (recommended long-term)
      // const script = new vm.Script(code);
      // const context = vm.createContext({ interaction, client: interaction.client, console, require });
      // result = await script.runInContext(context);

    } catch (e) {
      error = e;
    } finally {
      Object.assign(console, originals);
    }

    const embed = new EmbedBuilder().setColor(error ? 0xff0000 : 0x00ff00);

    if (logs.length) {
      const logText = logs.join('\n').slice(0, 1500);
      embed.addFields({ name: 'Console', value: codeBlock('ansi', logText), inline: false });
    }

    if (error) {
      embed.setTitle('Error').setDescription(codeBlock('js', error.stack?.slice(0, 1500) || error.toString()));
    } else if (result !== undefined) {
      const inspected = util.inspect(result, { depth: 3 });
      embed.setTitle('Result').setDescription(codeBlock('js', inspected.slice(0, 1500)));
    } else {
      embed.setDescription('Executed successfully (no return value)');
    }

    if (embed.length > 3900) { // rough embed limit
      embed.setDescription(embed.description?.slice(0, 3500) + '\n... (truncated)');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};