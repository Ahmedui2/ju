const { EmbedBuilder } = require('discord.js');

const name = 'top';

async function execute(message, args, { points }) {
  // Aggregate points per user across all responsibilities
  const userPoints = {};

  for (const responsibility in points) {
    if (typeof points[responsibility] === 'object') {
      for (const userId in points[responsibility]) {
        if (userId === 'claimedBy') continue;
        userPoints[userId] = (userPoints[userId] || 0) + points[responsibility][userId];
      }
    }
  }

  const sortedUsers = Object.entries(userPoints).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (sortedUsers.length === 0) {
    return message.reply('**لا توجد نقاط حتى الآن.**');
  }

  const embed = new EmbedBuilder()
    .setTitle('**توب المسؤولين بالنقاط**')
    .setDescription(
      sortedUsers
        .map(([userId, pts], index) => `${index + 1}. <@${userId}> - **${pts}** نقطة`)
        .join('\n')
    );

  await message.channel.send({ embeds: [embed] });
}

module.exports = { name, execute };
