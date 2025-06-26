const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const produtos = require('./produtos.json');
function sincronizarPrecos() {
    produtos.forEach(produto => {
        const precoMatch = produto.description.match(/R\$ ([\d,]+)/);

        if (precoMatch) {
            const precoExtraido = parseFloat(precoMatch[1].replace(',', '.'));
            produto.price = precoExtraido;
        }
    });
    console.log("Preços sincronizados com as descrições.");
}
// Chame a função para sincronizar os preços
sincronizarPrecos();
module.exports = {
    anunciar: {
        name: 'anunciar',
        description: 'Anuncia um produto específico pelo ID. Ex: !anunciar red-dead-2',
        async execute(message, args) {
            const productId = args[0];
            if (!productId) {
                return message.reply('Por favor, forneça o ID do produto que deseja anunciar. Ex: `!anunciar red-dead-2`');
            }
            const produto = produtos.find(p => p.id === productId);
            if (!produto) {
                return message.reply(`❌ Produto com ID **${productId}** não encontrado no seu catálogo.`);
            }
            const embed = new EmbedBuilder()
                .setTitle(`${produto.name}`)
                .setDescription(`${produto.description}\n\n**Preço:** R$ ${produto.price.toFixed(2).replace('.', ',')}`)
                .setColor('#FF4500')
                .setImage(produto.image);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`abrir_ticket_produto_${produto.id}`)
                    .setLabel('Abrir Ticket')
                    .setStyle(ButtonStyle.Success)
            );
            await message.channel.send({ embeds: [embed], components: [row] });
        }
    },
    ticket: {
        name: 'ticket',
        description: 'Envia uma mensagem com um botão para abrir um ticket de suporte/compra.',
        async execute(message) {
            const embed = new EmbedBuilder()
                .setTitle('Precisa de ajuda ou quer fazer uma compra?')
                .setDescription('Clique no botão abaixo para abrir um ticket e conversar com nossa equipe!')
                .setColor('#0099FF');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket_geral')
                    .setLabel('Abrir Ticket')
                    .setStyle(ButtonStyle.Primary)
            );
            await message.channel.send({ embeds: [embed], components: [row] });
        }
    }
};