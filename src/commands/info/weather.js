const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get current weather for a city.')
    .addStringOption(option =>
      option.setName('city')
        .setDescription('City name')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();

    const city = interaction.options.getString('city');
    const apiKey = config.openWeatherApiKey;
    if (!apiKey) {
      return interaction.editReply({ content: '❌ Weather API key not configured.' });
    }

    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
      const data = await response.json();

      if (data.cod !== 200) {
        return interaction.editReply({ content: `❌ ${data.message}` });
      }

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(`🌤️ Weather in ${data.name}, ${data.sys.country}`)
        .setDescription(data.weather[0].description)
        .addFields(
          { name: 'Temperature', value: `${data.main.temp}°C`, inline: true },
          { name: 'Feels like', value: `${data.main.feels_like}°C`, inline: true },
          { name: 'Humidity', value: `${data.main.humidity}%`, inline: true },
          { name: 'Wind', value: `${data.wind.speed} m/s`, inline: true },
          { name: 'Pressure', value: `${data.main.pressure} hPa`, inline: true }
        )
        .setFooter({ text: 'Powered by OpenWeatherMap' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred while fetching weather data.' });
    }
  },
};


