const name = 'adminroles';

async function execute(message, args, { ADMIN_ROLES, saveData, BOT_OWNERS }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  if (args.length === 0) {
    return message.reply(`**الأدوار المسموح لها استخدام أمر مسؤول: ${ADMIN_ROLES.length > 0 ? ADMIN_ROLES.map(r => `<@&${r}>`).join(', ') : 'لا يوجد أدوار محددة'}**`);
  }
 
  const subCommand = args[0].toLowerCase();
  const roleId = args[1]?.replace(/[<@&>]/g, '');

  if (!roleId) {
    return message.reply('**يرجى تحديد معرف الدور أو منشنه.**');
  }

  if (subCommand === 'add') {
    if (ADMIN_ROLES.includes(roleId)) {
      return message.reply('**هذا الدور موجود بالفعل في القائمة.**');
    }
    ADMIN_ROLES.push(roleId);
    saveData();
    return message.reply("**تمت إضافة الدور <@&" + roleId + "> إلى قائمة الأدوار المسموح لها.**");
  } else if (subCommand === 'remove') {
    const index = ADMIN_ROLES.indexOf(roleId);
    if (index === -1) {
      return message.reply('**هذا الدور غير موجود في القائمة.**');
    }
    ADMIN_ROLES.splice(index, 1);
    saveData();
    return message.reply("**تمت إزالة الدور <@&" + roleId + "> من قائمة الأدوار المسموح لها.**");
  } else {
    return message.reply('**الأوامر المتاحة: add <role>, remove <role>**');
  }
}

module.exports = { name, execute };
