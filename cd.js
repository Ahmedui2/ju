const name = 'cd';

async function execute(message, args, { BOT_OWNERS, client }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  if (args.length === 0) {
    // Show current cooldown status
    const currentCooldown = client.responsibilityCooldown?.time || 0;
    const currentSeconds = Math.floor(currentCooldown / 1000);
    
    if (currentSeconds === 0) {
      return message.reply('**الكولداون حالياً: معطل**\n**استخدم: .cd <الوقت بالثواني> أو .cd off لإلغاء الكولداون**\n**مثال: .cd 60 (لوضع كولداون 60 ثانية)**');
    } else {
      return message.reply(`**الكولداون حالياً: ${currentSeconds} ثانية**\n**استخدم: .cd <الوقت بالثواني> أو .cd off لإلغاء الكولداون**\n**مثال: .cd 60 (لوضع كولداون 60 ثانية)**`);
    }
  }

  const input = args[0].toLowerCase();

  // Store cooldown in client object
  if (!client.responsibilityCooldown) {
    client.responsibilityCooldown = { time: 0, users: {} };
  }

  if (input === 'off' || input === 'disable' || input === 'الغاء') {
    client.responsibilityCooldown.time = 0;
    client.responsibilityCooldown.users = {}; // Clear all user cooldowns
    await message.reply('**تم إلغاء الكولداون بين طلبات المسؤولين.**');
    return;
  }

  const cooldownTime = parseInt(input);
  if (isNaN(cooldownTime) || cooldownTime < 0) {
    return message.reply('**يرجى إدخال رقم صحيح للوقت بالثواني أو استخدم "off" لإلغاء الكولداون!**');
  }

  client.responsibilityCooldown.time = cooldownTime * 1000; // Convert to milliseconds
  client.responsibilityCooldown.users = {}; // Clear existing user cooldowns
  
  if (cooldownTime === 0) {
    await message.reply('**تم إلغاء الكولداون بين طلبات المسؤولين.**');
  } else {
    await message.reply(`**تم تعيين كولداون ${cooldownTime} ثانية بين طلبات المسؤولين.**`);
  }
}

module.exports = { name, execute };
