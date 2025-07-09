const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const name = 'settings';

async function execute(message, args, { responsibilities, saveData, BOT_OWNERS, client }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  async function sendSettingsMenu() {
    // Build embed with responsibilities list
    const embed = new EmbedBuilder()
      .setTitle('**إعدادات المسؤوليات**')
      .setDescription('اختر مسؤولية من القائمة لتعديلها أو حذفها أو إضافة مسؤولين.\nيمكنك أيضًا إضافة مسؤولية جديدة.');

    // Build select menu options from responsibilities
    const options = Object.keys(responsibilities).map(key => ({
      label: key,
      description: responsibilities[key].description ? responsibilities[key].description.substring(0, 50) : 'لا يوجد شرح',
      value: key
    }));

    // Add option to add new responsibility
    options.push({
      label: 'إضافة مسؤولية جديدة',
      description: 'إنشاء مسؤولية جديدة',
      value: 'add_new'
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('settings_select_responsibility')
      .setPlaceholder('اختر مسؤولية')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await message.channel.send({ embeds: [embed], components: [row] });
  }

  const sentMessage = await sendSettingsMenu();

  const filter = i => i.user.id === message.author.id;
  const collector = message.channel.createMessageComponentCollector({ filter, time: 600000 });

  collector.on('collect', async interaction => {
    if (interaction.customId === 'settings_select_responsibility') {
      const selected = interaction.values[0];

      if (selected === 'add_new') {
        // Show modal to add new responsibility
        const modal = new ModalBuilder()
          .setCustomId('add_responsibility_modal')
          .setTitle('**إضافة مسؤولية جديدة**');

        const nameInput = new TextInputBuilder()
          .setCustomId('responsibility_name')
          .setLabel('اسم المسؤولية')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const descInput = new TextInputBuilder()
          .setCustomId('responsibility_desc')
          .setLabel('شرح المسؤولية (أرسل "لا" لعدم الشرح)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
      } else {
        // Edit or delete existing responsibility
        const responsibility = responsibilities[selected];

        // Build buttons for edit, delete, add/remove responsible persons
        const editButton = new ButtonBuilder()
          .setCustomId(`edit_${selected}`)
          .setLabel('تعديل')
          .setStyle(ButtonStyle.Primary);

        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_${selected}`)
          .setLabel('حذف')
          .setStyle(ButtonStyle.Danger);

        const manageButton = new ButtonBuilder()
          .setCustomId(`manage_${selected}`)
          .setLabel('إدارة المسؤولين')
          .setStyle(ButtonStyle.Secondary);

        const backButton = new ButtonBuilder()
          .setCustomId('back_to_menu')
          .setLabel('العودة للقائمة')
          .setStyle(ButtonStyle.Secondary);

        const buttonsRow = new ActionRowBuilder().addComponents(editButton, deleteButton, manageButton, backButton);

        const respList = responsibility.responsibles && responsibility.responsibles.length > 0
          ? responsibility.responsibles.map(r => `<@${r}>`).join(', ')
          : '**لا يوجد مسؤولين معينين**';

        const desc = responsibility.description && responsibility.description.toLowerCase() !== 'لا'
          ? responsibility.description
          : '**لا يوجد شرح**';

        const embedEdit = new EmbedBuilder()
          .setTitle(`**تعديل المسؤولية: ${selected}**`)
          .setDescription(`**المسؤولون:** ${respList}\n**الشرح:** ${desc}`);

        await interaction.update({ embeds: [embedEdit], components: [buttonsRow] });
      }
    } else if (interaction.customId === 'back_to_menu') {
      // Return to main menu
      const embed = new EmbedBuilder()
        .setTitle('**إعدادات المسؤوليات**')
        .setDescription('اختر مسؤولية من القائمة لتعديلها أو حذفها أو إضافة مسؤولين.\nيمكنك أيضًا إضافة مسؤولية جديدة.');

      const options = Object.keys(responsibilities).map(key => ({
        label: key,
        description: responsibilities[key].description ? responsibilities[key].description.substring(0, 50) : 'لا يوجد شرح',
        value: key
      }));

      options.push({
        label: 'إضافة مسؤولية جديدة',
        description: 'إنشاء مسؤولية جديدة',
        value: 'add_new'
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('settings_select_responsibility')
        .setPlaceholder('اختر مسؤولية')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.update({ embeds: [embed], components: [row] });
    } else if (interaction.isButton()) {
      const [action, responsibilityName] = interaction.customId.split('_');
      if (!responsibilityName || !responsibilities[responsibilityName]) {
        return interaction.reply({ content: '**المسؤولية غير موجودة!**', flags: 64 });
      }

      if (action === 'delete') {
        delete responsibilities[responsibilityName];
        saveData();
        await interaction.reply({ content: `**تم حذف المسؤولية: ${responsibilityName}**`, flags: 64 });
        
        // Return to main menu after deletion
        setTimeout(async () => {
          const embed = new EmbedBuilder()
            .setTitle('**إعدادات المسؤوليات**')
            .setDescription('اختر مسؤولية من القائمة لتعديلها أو حذفها أو إضافة مسؤولين.\nيمكنك أيضًا إضافة مسؤولية جديدة.');

          const options = Object.keys(responsibilities).map(key => ({
            label: key,
            description: responsibilities[key].description ? responsibilities[key].description.substring(0, 50) : 'لا يوجد شرح',
            value: key
          }));

          options.push({
            label: 'إضافة مسؤولية جديدة',
            description: 'إنشاء مسؤولية جديدة',
            value: 'add_new'
          });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('settings_select_responsibility')
            .setPlaceholder('اختر مسؤولية')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await sentMessage.edit({ embeds: [embed], components: [row] });
        }, 2000);
      } else if (action === 'edit') {
        // Show modal to edit description
        const modal = new ModalBuilder()
          .setCustomId(`edit_desc_modal_${responsibilityName}`)
          .setTitle(`**تعديل شرح المسؤولية: ${responsibilityName}**`);

        const descInput = new TextInputBuilder()
          .setCustomId('responsibility_desc')
          .setLabel('شرح المسؤولية (أرسل "لا" لعدم الشرح)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setValue(responsibilities[responsibilityName].description || '');

        const actionRow = new ActionRowBuilder().addComponents(descInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      } else if (action === 'manage') {
        // Show modal to add/remove responsibles
        const modal = new ModalBuilder()
          .setCustomId(`manage_responsibles_modal_${responsibilityName}`)
          .setTitle(`**إدارة المسؤولين: ${responsibilityName}**`);

        const respInput = new TextInputBuilder()
          .setCustomId('responsibles')
          .setLabel('أدخل معرفات المسؤولين (افصل بفواصل)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setValue(responsibilities[responsibilityName].responsibles ? responsibilities[responsibilityName].responsibles.join(', ') : '');

        const actionRow = new ActionRowBuilder().addComponents(respInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.user.id !== message.author.id) return;

    if (interaction.customId === 'add_responsibility_modal') {
      const name = interaction.fields.getTextInputValue('responsibility_name').trim();
      const desc = interaction.fields.getTextInputValue('responsibility_desc').trim();

      if (responsibilities[name]) {
        return interaction.reply({ content: '**هذه المسؤولية موجودة بالفعل!**', flags: 64 });
      }

      responsibilities[name] = {
        description: desc.toLowerCase() === 'لا' ? '' : desc,
        responsibles: []
      };
      saveData();
      
      await interaction.reply({ content: `**تم إنشاء المسؤولية: ${name}**\n**الآن منشن المسؤولين أو أرسل معرفاتهم (افصل بينهم بفواصل):**`, flags: 64 });
      
      // Wait for user to mention responsibles
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });
      
      collector.on('collect', async (msg) => {
        const mentions = msg.mentions.users.map(user => user.id);
        const textIds = msg.content.split(',').map(s => s.trim().replace(/[<@!>]/g, '')).filter(s => s.length > 0 && /^\d+$/.test(s));
        const allIds = [...new Set([...mentions, ...textIds])];
        
        if (allIds.length > 0) {
          responsibilities[name].responsibles = allIds;
          saveData();
          await msg.reply(`**تم تعيين ${allIds.length} مسؤول للمسؤولية: ${name}**`);
        } else {
          await msg.reply(`**لم يتم تعيين أي مسؤولين للمسؤولية: ${name}**`);
        }
      });
      
      collector.on('end', () => {
        // Update the main menu
        setTimeout(async () => {
          const embed = new EmbedBuilder()
            .setTitle('**إعدادات المسؤوليات**')
            .setDescription('اختر مسؤولية من القائمة لتعديلها أو حذفها أو إضافة مسؤولين.\nيمكنك أيضًا إضافة مسؤولية جديدة.');

          const options = Object.keys(responsibilities).map(key => ({
            label: key,
            description: responsibilities[key].description ? responsibilities[key].description.substring(0, 50) : 'لا يوجد شرح',
            value: key
          }));

          options.push({
            label: 'إضافة مسؤولية جديدة',
            description: 'إنشاء مسؤولية جديدة',
            value: 'add_new'
          });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('settings_select_responsibility')
            .setPlaceholder('اختر مسؤولية')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await sentMessage.edit({ embeds: [embed], components: [row] });
        }, 3000);
      });
    } else if (interaction.customId.startsWith('edit_desc_modal_')) {
      const responsibilityName = interaction.customId.replace('edit_desc_modal_', '');
      const desc = interaction.fields.getTextInputValue('responsibility_desc').trim();

      if (!responsibilities[responsibilityName]) {
        return interaction.reply({ content: '**المسؤولية غير موجودة!**', flags: 64 });
      }

      responsibilities[responsibilityName].description = desc.toLowerCase() === 'لا' ? '' : desc;
      saveData();
      await interaction.reply({ content: `**تم تعديل شرح المسؤولية: ${responsibilityName}**`, flags: 64 });
    } else if (interaction.customId.startsWith('manage_responsibles_modal_')) {
      const responsibilityName = interaction.customId.replace('manage_responsibles_modal_', '');
      const respText = interaction.fields.getTextInputValue('responsibles').trim();

      if (!responsibilities[responsibilityName]) {
        return interaction.reply({ content: '**المسؤولية غير موجودة!**', flags: 64 });
      }

      // Parse responsibles from input (IDs or mentions)
      const respIds = respText ? respText.split(',').map(s => s.trim().replace(/[<@!>]/g, '')).filter(s => s.length > 0) : [];

      responsibilities[responsibilityName].responsibles = respIds;
      saveData();
      await interaction.reply({ content: `**تم تحديث المسؤولين للمسؤولية: ${responsibilityName}**`, flags: 64 });
    }
  });
}

module.exports = { name, execute };
