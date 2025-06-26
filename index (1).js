require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const commands = require('./commands');
const produtos = require('./produtos.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const prefix = '!';

client.once('ready', () => {
  console.log(`🤖 Bot está online como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands[commandName];
  if (command) {
    command.execute(message, args);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const prodId = interaction.customId.replace('add_to_cart_', '');
  const produto = produtos.find(p => p.id === prodId);

  if (!produto) {
    await interaction.reply({ content: '❌ Produto não encontrado.', ephemeral: true });
    return;
  }

  try {
    await interaction.reply({
      content: `🛒 Você escolheu **${produto.name}** por **R$ ${produto.price}**.\nAbra um ticket para finalizar a compra.`,
      ephemeral: true
    });
  } catch (err) {
    console.error(err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.customId !== 'abrir_ticket') return;

  const guild = interaction.guild;
  const userId = interaction.user.id;
  const existingChannel = guild.channels.cache.find(
    c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
  );

  if (existingChannel) {
    return interaction.reply({
      content: `📩 Você já tem um ticket aberto: ${existingChannel}`,
      ephemeral: true
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: userId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: '1386799470146093217', // ID do cargo ADM
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('🔒 Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: `🎫 Olá <@${userId}>! Um membro da equipe irá te atender em breve.`,
    components: [row],
  });

  await interaction.reply({
    content: `✅ Ticket criado: ${ticketChannel}`,
    ephemeral: true
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.customId !== 'fechar_ticket') return;

  const channel = interaction.channel;
  await channel.send('🔒 Este ticket será fechado em 5 segundos...');
  setTimeout(() => {
    channel.delete();
  }, 5000);
});

client.login(process.env.TOKEN);
