const { Client, GatewayIntentBits, Partials, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const PREFIX = '.';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

const BOT_OWNERS = process.env.BOT_OWNERS ? process.env.BOT_OWNERS.split(',') : [];
const ADMIN_ROLES = process.env.ADMIN_ROLES ? process.env.ADMIN_ROLES.split(',') : [];

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
      client.commands.set(command.name, command);
    }
  }
}

// In-memory data storage (can be replaced with JSON file or DB)
let responsibilities = {};
let points = {};

// Load data from JSON files if exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const responsibilitiesFile = path.join(dataDir, 'responsibilities.json');
const pointsFile = path.join(dataDir, 'points.json');

if (fs.existsSync(responsibilitiesFile)) {
  responsibilities = JSON.parse(fs.readFileSync(responsibilitiesFile, 'utf8'));
}
if (fs.existsSync(pointsFile)) {
  points = JSON.parse(fs.readFileSync(pointsFile, 'utf8'));
}

function saveData() {
  fs.writeFileSync(responsibilitiesFile, JSON.stringify(responsibilities, null, 2));
  fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
}

client.once('ready', () => {
  console.log('**بوت المسؤوليات جاهز للعمل!**');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, { responsibilities, points, saveData, BOT_OWNERS, ADMIN_ROLES, client });
  } catch (error) {
    console.error(error);
    message.reply('**حدث خطأ أثناء تنفيذ الأمر!**');
  }
});

// Store active tasks to prevent multiple claims
if (!client.activeTasks) {
  client.activeTasks = new Map();
}

// Handle claim button in DMs - using global listener
if (!client.claimListenerSetup) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('claim_task_')) return;

    try {
      const parts = interaction.customId.split('_');
      const responsibilityName = parts[2];
      const timestamp = parts[3];
      const requesterId = parts[4];
      const taskId = `${responsibilityName}_${timestamp}`;

      // Check if task is already claimed
      if (client.activeTasks.has(taskId)) {
        const claimedBy = client.activeTasks.get(taskId);
        return interaction.reply({
          content: `**تم استلام هذه المهمة من قبل ${claimedBy}**`,
          ephemeral: true
        });
      }

      // Mark task as claimed
      const guild = client.guilds.cache.first();
      let displayName = interaction.user.username;
      if (guild) {
        try {
          const member = await guild.members.fetch(interaction.user.id);
          displayName = member.displayName || member.user.displayName || member.user.username;
        } catch (error) {
          console.error('Failed to fetch member:', error);
        }
      }
      
      client.activeTasks.set(taskId, displayName);

      // Add point to user
      if (!points[responsibilityName]) points[responsibilityName] = {};
      points[responsibilityName][interaction.user.id] = (points[responsibilityName][interaction.user.id] || 0) + 1;
      saveData();

      // Update message to remove button completely
      await interaction.update({
        content: `**تم استلام المهمة من قبل ${displayName}**`,
        components: []
      });

      // Send notification to requester
      try {
        const requester = await client.users.fetch(requesterId);
        await requester.send(`**تم استلام دعوتك من مسؤول الـ${responsibilityName} وهو ${displayName}**`);
      } catch (error) {
        console.error('Failed to send notification to requester:', error);
      }

      // Notify all other responsibles that task was claimed
      if (responsibilities[responsibilityName] && responsibilities[responsibilityName].responsibles) {
        const responsibles = responsibilities[responsibilityName].responsibles;
        for (const userId of responsibles) {
          if (userId !== interaction.user.id) {
            try {
              const user = await client.users.fetch(userId);
              await user.send(`**تم استلام المهمة الخاصة بـ${responsibilityName} من قبل ${displayName}**`);
            } catch (error) {
              console.error(`Failed to notify user ${userId}:`, error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in claim button handler:', error);
      try {
        await interaction.reply({ content: '**حدث خطأ أثناء معالجة الطلب.**', flags: 64 });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  });
  client.claimListenerSetup = true;
}

client.login(process.env.DISCORD_TOKEN);
