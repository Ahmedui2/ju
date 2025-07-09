const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const name = 'setup';

async function execute(message, args, { responsibilities, points, saveData, BOT_OWNERS, client }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  // Check for attachment or link in args
  let imageUrl = null;
  if (message.attachments.size > 0) {
    imageUrl = message.attachments.first().url;
  } else if (args.length > 0) {
    const url = args[0];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      imageUrl = url;
    }
  }

  if (!imageUrl) {
    return message.reply('**يرجى إرفاق صورة مع الأمر (رابط أو ملف).**');
  }

  // Build select menu options from responsibilities
  const options = Object.keys(responsibilities).map(key => ({
    label: key,
    value: key
  }));

  if (options.length === 0) {
    return message.reply('**لا توجد مسؤوليات معرفة حتى الآن.**');
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('setup_select_responsibility')
    .setPlaceholder('اختر مسؤولية')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setImage(imageUrl);

  const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

  // Collector for select menu
  const filter = i => i.user.id === message.author.id && i.message.id === sentMessage.id;
  const collector = message.channel.createMessageComponentCollector({ filter, time: 600000 });

  collector.on('collect', async interaction => {
    if (interaction.customId === 'setup_select_responsibility') {
      const selected = interaction.values[0];
      const responsibility = responsibilities[selected];
      if (!responsibility) {
        return interaction.reply({ content: '**المسؤولية غير موجودة!**', flags: 64 });
      }

      const desc = responsibility.description && responsibility.description.toLowerCase() !== 'لا'
        ? responsibility.description
        : '**لا يوجد شرح**';

      // Build buttons for each responsible with their nicknames
      const buttons = [];
      if (responsibility.responsibles && responsibility.responsibles.length > 0) {
        for (const userId of responsibility.responsibles) {
          try {
            const member = await message.guild.members.fetch(userId);
            const displayName = member.displayName || member.user.username;
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`setup_contact_${selected}_${userId}`)
                .setLabel(displayName)
                .setStyle(ButtonStyle.Primary)
            );
          } catch (error) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`setup_contact_${selected}_${userId}`)
                .setLabel(`User ${userId}`)
                .setStyle(ButtonStyle.Primary)
            );
          }
        }
      }

      const allButton = new ButtonBuilder()
        .setCustomId(`setup_contact_${selected}_all`)
        .setLabel('الكل')
        .setStyle(ButtonStyle.Success);

      buttons.push(allButton);

      const buttonsRow = new ActionRowBuilder().addComponents(...buttons.slice(0, 5));
      const buttonsRow2 = buttons.length > 5 ? new ActionRowBuilder().addComponents(...buttons.slice(5, 10)) : null;

      const components = [buttonsRow];
      if (buttonsRow2) components.push(buttonsRow2);

      await interaction.reply({
        content: `**المسؤولية: ${selected}**\n**الشرح:** ${desc}`,
        components: components,
        flags: 64
      });

      // Update the main menu to refresh
      setTimeout(async () => {
        try {
          const newOptions = Object.keys(responsibilities).map(key => ({
            label: key,
            value: key
          }));

          const newSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('setup_select_responsibility')
            .setPlaceholder('اختر مسؤولية')
            .addOptions(newOptions);

          const newRow = new ActionRowBuilder().addComponents(newSelectMenu);

          await sentMessage.edit({ embeds: [embed], components: [newRow] });
        } catch (error) {
          console.error('Failed to update menu:', error);
        }
      }, 2000);
    }
  });

  // Handle button clicks for contacting responsibles
  const buttonCollector = message.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === message.author.id && i.customId.startsWith('setup_contact_'), 
    time: 600000 
  });

  buttonCollector.on('collect', async interaction => {
    try {
      // Check cooldown
      if (!client.responsibilityCooldown) {
        client.responsibilityCooldown = { time: 0, users: {} };
      }

      const cooldownTime = client.responsibilityCooldown.time || 0;
      const userId = interaction.user.id;
      const now = Date.now();

      if (cooldownTime > 0 && client.responsibilityCooldown.users[userId]) {
        const timeLeft = client.responsibilityCooldown.users[userId] + cooldownTime - now;
        if (timeLeft > 0) {
          const secondsLeft = Math.ceil(timeLeft / 1000);
          return interaction.reply({ 
            content: `**يجب الانتظار ${secondsLeft} ثانية قبل إرسال طلب آخر.**`, 
            flags: 64 
          });
        }
      }

      const parts = interaction.customId.split('_');
      const responsibilityName = parts[2];
      const target = parts[3]; // userId or 'all'

      // Show modal to enter reason
      const modal = new ModalBuilder()
        .setCustomId(`setup_reason_modal_${responsibilityName}_${target}_${Date.now()}`)
        .setTitle('أدخل سبب الحاجة للمسؤول');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('السبب')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error in button collector:', error);
      try {
        await interaction.reply({ content: '**حدث خطأ أثناء معالجة الطلب.**', flags: 64 });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  });

  // Handle modal submissions globally without removing listeners
  if (!client.setupModalHandlerSetup) {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (!interaction.customId.startsWith('setup_reason_modal_')) return;

      try {
        const customIdParts = interaction.customId.replace('setup_reason_modal_', '').split('_');
        const responsibilityName = customIdParts[0];
        const target = customIdParts[1];
        const reason = interaction.fields.getTextInputValue('reason').trim();

        if (!responsibilities[responsibilityName]) {
          return interaction.reply({ content: '**المسؤولية غير موجودة!**', flags: 64 });
        }

        const responsibility = responsibilities[responsibilityName];
        const responsibles = responsibility.responsibles || [];

        if (responsibles.length === 0) {
          return interaction.reply({ content: '**لا يوجد مسؤولين معينين لهذه المسؤولية.**', flags: 64 });
        }

        // Set cooldown for user
        const cooldownTime = client.responsibilityCooldown?.time || 0;
        if (cooldownTime > 0) {
          if (!client.responsibilityCooldown.users) client.responsibilityCooldown.users = {};
          client.responsibilityCooldown.users[interaction.user.id] = Date.now();
        }

        const embed = new EmbedBuilder()
          .setTitle(`**طلب مساعدة في المسؤولية: ${responsibilityName}**`)
          .setDescription(`**السبب:** ${reason}\n**من:** ${interaction.user}`)
          .setColor('#0099ff');

        const claimButton = new ButtonBuilder()
          .setCustomId(`claim_task_${responsibilityName}_${Date.now()}_${interaction.user.id}`)
          .setLabel('استلام')
          .setStyle(ButtonStyle.Success);

        const buttonRow = new ActionRowBuilder().addComponents(claimButton);

        if (target === 'all') {
          // Send to all responsibles
          for (const userId of responsibles) {
            try {
              const user = await client.users.fetch(userId);
              await user.send({ embeds: [embed], components: [buttonRow] });
            } catch (error) {
              console.error(`Failed to send DM to user ${userId}:`, error);
            }
          }
          await interaction.reply({ content: '**تم إرسال الطلب لجميع المسؤولين.**', flags: 64 });
        } else {
          // Send to specific user
          try {
            const user = await client.users.fetch(target);
            await user.send({ embeds: [embed], components: [buttonRow] });
            await interaction.reply({ content: `**تم إرسال الطلب إلى ${user.username}.**`, flags: 64 });
          } catch (error) {
            await interaction.reply({ content: '**فشل في إرسال الرسالة الخاصة.**', flags: 64 });
          }
        }
      } catch (error) {
        console.error('Error in modal handler:', error);
        try {
          await interaction.reply({ content: '**حدث خطأ أثناء معالجة الطلب.**', flags: 64 });
        } catch (replyError) {
          console.error('Failed to send error reply:', replyError);
        }
      }
    });
    client.setupModalHandlerSetup = true;
  }
}

module.exports = { name, execute };
