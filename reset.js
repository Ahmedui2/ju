const name = 'reset';

async function execute(message, args, { points, saveData, BOT_OWNERS }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  for (const responsibility in points) {
    points[responsibility] = {};
  }
  saveData();

  await message.channel.send('**تم تصفير جميع النقاط بنجاح!**');
}

module.exports = { name, execute };
