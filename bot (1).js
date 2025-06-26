require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType
} = require('discord.js');

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Bot da VSNTKeys está rodando!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor web Express ativo na porta ${PORT}`);
});

// O PRODUTOS.JSON DEVE SER IMPORTADO AQUI NO BOT.JS TAMBÉM!
// Ele é necessário para buscar os detalhes do produto quando o botão é clicado.
const produtos = require('./produtos.json'); 
const commands = require('./commands.js');

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
const pixKey = 'b67d5d06-f671-4582-85c0-196c411b1c73';
const lojaNome = 'VsnTKeys';

const staffRoleId = '1386799470146093217'; // ID do cargo ADM/Staff

client.once('ready', () => {
    console.log(`🤖 Bot da ${lojaNome} online!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands[commandName];
    if (command) {
        try {
            // Passamos 'produtos' para o comando 'anunciar' caso ele precise.
            // Embora não seja mais estritamente necessário no comando em si, é uma boa prática se houvesse futuras necessidades.
            await command.execute(message, args, { pixKey, lojaNome, produtos }); 
        } catch (err) {
            console.error('Erro ao executar comando:', err);
            message.reply('Houve um erro ao tentar executar este comando.');
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    // Lógica para ABRIR TICKET (AGORA VAI DISTINGUIR ENTRE PRODUTO E GERAL)
    if (interaction.customId.startsWith('abrir_ticket_produto_') || interaction.customId === 'abrir_ticket_geral') {
        let productName = 'um item/suporte geral'; // Mensagem padrão para ticket genérico
        let productPrice = ''; // Preço vazio para ticket genérico

        // SE O BOTÃO CLICADO COMEÇA COM 'abrir_ticket_produto_', ENTÃO É UM PRODUTO ESPECÍFICO
        if (interaction.customId.startsWith('abrir_ticket_produto_')) {
            const prodId = interaction.customId.replace('abrir_ticket_produto_', ''); // Extrai o ID do produto do customId do botão
            const produto = produtos.find(p => p.id === prodId); // Busca o produto no array 'produtos'
            if (produto) { // Se o produto for encontrado
                productName = produto.name; // Pega o nome do produto
                productPrice = ` (R$ ${produto.price.toFixed(2).replace('.', ',')})`; // Pega o preço
            } else {
                // Caso MUITO raro: botão tinha um ID de produto, mas o produto não foi encontrado no JSON.
                // Isso só aconteceria se o JSON fosse alterado DEPOIS que o anúncio foi feito, e ANTES do botão ser clicado.
                console.warn(`Produto com ID ${prodId} não encontrado ao abrir ticket. Usando mensagem genérica.`);
                productName = 'um item específico'; 
            }
        }

        if (!interaction.guild) {
            await interaction.reply({ content: 'Este botão só funciona dentro de servidores.', ephemeral: true });
            return;
        }

        const guild = interaction.guild;
        const userId = interaction.user.id;
        const username = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

        const staffRole = guild.roles.cache.get(staffRoleId);
        if (!staffRole) {
            await interaction.reply({ content: '❌ O cargo de Staff não foi encontrado. Verifique o ID configurado no bot (`staffRoleId`).', ephemeral: true });
            return;
        }

        // Verifica se já existe ticket aberto para o usuário
        const existingChannel = guild.channels.cache.find(
            c => c.name === `ticket-${username}` && c.type === ChannelType.GuildText
        );
        if (existingChannel) {
            await interaction.reply({ content: `📩 Você já tem um ticket aberto: ${existingChannel}`, ephemeral: true });
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const ticketChannel = await guild.channels.create({
                name: `ticket-${username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
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
                        id: staffRole.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                        ],
                    },
                ],
            });

            const closeTicketRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('🔒 Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            let ticketMessageContent;
            // Personaliza a mensagem do ticket com base no tipo de botão clicado
            if (interaction.customId === 'abrir_ticket_geral') {
                ticketMessageContent = `🎫 Olá <@${userId}>! Um membro da equipe irá te atender em breve para suporte geral, dúvidas ou para sua compra.\n\n${staffRole ? `<@&${staffRoleId}>` : 'Um membro da equipe'} foi notificado.\n\nPara fechar este ticket, clique no botão abaixo.`;
            } else { // Se for um ticket de produto específico
                ticketMessageContent = `🎫 Olá <@${userId}>! Você abriu um ticket para comprar **${productName}**${productPrice}.\n\n${staffRole ? `<@&${staffRoleId}>` : 'Um membro da equipe'} foi notificado.\n\nPara fechar este ticket, clique no botão abaixo.`;
            }

            await ticketChannel.send({
                content: ticketMessageContent,
                components: [closeTicketRow],
            });

            await interaction.editReply({
                content: `✅ Ticket criado: ${ticketChannel}`,
                ephemeral: true
            });
        } catch (err) {
            console.error('Erro ao criar ticket:', err);
            await interaction.editReply({ content: '❌ Erro ao criar ticket. Verifique as permissões do bot no servidor e se o ID do cargo de Staff está correto.', ephemeral: true });
        }
        return;
    }

    // Lógica para o botão "Fechar Ticket"
    if (interaction.customId === 'fechar_ticket') {
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            await interaction.reply({ content: 'Este botão só pode ser usado em canais de ticket.', ephemeral: true });
            return;
        }

        await interaction.reply({ content: '🔒 Este ticket será fechado em 5 segundos...', ephemeral: false });
        setTimeout(() => {
            channel.delete().catch(err => {
                console.error('Erro ao deletar canal do ticket:', err);
            });
        }, 5000);
        return;
    }
});

client.login(process.env.TOKEN);