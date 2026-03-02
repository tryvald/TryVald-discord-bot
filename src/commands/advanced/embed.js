const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed.')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Embed description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Hex color (e.g., #1d466b)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Footer text')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Image URL')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color') || '#3498db';
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });
    if (image) embed.setImage(image);

    await interaction.reply({ embeds: [embed] });
  },
};