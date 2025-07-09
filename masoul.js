const { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const name = 'مسؤول';

async function execute(message, args, { responsibilities, points, saveData, ADMIN_ROLES, client }) {
  // Check if user has admin roles
  const member = await message.guild.members.fetch(message.author.id);
  const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLES.includes(role.id));
  if (!hasAdminRole) {
    return message.reply('**هذا الأمر مخصص للإداريين فقط!**');
  }

  // Build select menu options from responsibilities
  const options = Object.keys(responsibilities).map(key => ({
    label: key,
    description: responsibilities[key].description ? responsibilities[key].description.substring(0, 50) : 'لا يوجد شرح',
    value: key
  }));

  if (options.length === 0) {
    return message.reply('**لا توجد مسؤوليات معرفة حتى الآن.**');
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('masoul_select_responsibility')
    .setPlaceholder('اختر مسؤولية')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const sentMessage = await message.channel.send({ content: '**اختر مسؤولية من القائمة:**', components: [row] });

  const filter = i => i.user.id === message.author.id && i.message.id === sentMessage.id;
  const collector = message.channel.createMessageComponentCollector({ filter, time: 600000 });

  collector.on('collect', async interaction => {
    if (interaction.customId === 'masoul_select_responsibility') {
      const selected = interaction.values[0];
      const responsibility = responsibilities[selected];
      if (!responsibility) {
        return interaction.reply({ content: '**المسؤولية غير موجودة!**', ephemeral: true });
      }

      // Show modal to enter reason
      const modal = new ModalBuilder()
        .setCustomId(`masoul_reason_modal_${selected}`)
        .setTitle('**أدخل سبب التواصل مع المسؤولين**');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('السبب')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('masoul_reason_modal_')) return;
    if (interaction.user.id !== message.author.id) return;

    const responsibilityName = interaction.customId.replace('masoul_reason_modal_', '');
    const reason = interaction.fields.getTextInputValue('reason').trim();

    if (!responsibilities[responsibilityName]) {
      return interaction.reply({ content: '**المسؤولية غير موجودة!**', ephemeral: true });
    }

    const responsibility = responsibilities[responsibilityName];
    const responsibles = responsibility.responsibles || [];

    if (responsibles.length === 0) {
      return interaction.reply({ content: '**لا يوجد مسؤولين معينين لهذه المسؤولية.**', ephemeral: true });
    }

    // Send DM to each responsible with buttons
    const buttons = responsibles.map(r =>
      new ButtonBuilder()
        .setCustomId(`claim_${responsibilityName}_${r}`)
        .setLabel(`@${r}`)
        .setStyle(ButtonStyle.Primary)
    );

    const allButton = new ButtonBuilder()
      .setCustomId(`claim_all_${responsibilityName}`)
      .setLabel('الكل')
      .setStyle(ButtonStyle.Success);

    const buttonsRow = new ActionRowBuilder().addComponents(...buttons.slice(0, 4));
    const buttonsRow2 = new ActionRowBuilder().addComponents(...buttons.slice(4, 8));
    const allButtonRow = new ActionRowBuilder().addComponents(allButton);

    const embed = new EmbedBuilder()
      .setTitle(`**رسالة من ${message.author.tag} بخصوص المسؤولية: ${responsibilityName}**`)
      .setDescription(`**السبب:** ${reason}`);

    for (const userId of responsibles) {
      try {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [embed], components: [buttonsRow, buttonsRow2, allButtonRow].filter(row => row.components.length > 0) });
      } catch (error) {
        console.error(`Failed to send DM to user ${userId}:`, error);
      }
    }

    await interaction.reply({ content: '**تم إرسال الرسالة للمسؤولين.**', ephemeral: true });
  });
}

module.exports = { name, execute };
