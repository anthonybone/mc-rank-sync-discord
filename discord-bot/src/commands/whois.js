const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whois')
        .setDescription('Look up the Minecraft account linked to a Discord user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The Discord user to look up')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const link = database.getLinkByDiscordId(user.id);

            if (!link) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF9900)
                    .setTitle('🔍 User Lookup')
                    .setDescription(`${user} is not linked to any Minecraft account.`)
                    .setThumbnail(user.displayAvatarURL());
                
                return interaction.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🔍 User Lookup')
                .setDescription(`${user} is linked to a Minecraft account.`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: 'Minecraft Username', value: link.mc_name, inline: true },
                    { name: 'Minecraft UUID', value: `\`${link.mc_uuid}\``, inline: false },
                    { name: 'Linked Since', value: new Date(link.linked_at).toLocaleString(), inline: true }
                );

            // Try to get Minecraft head as thumbnail
            const headUrl = `https://mc-heads.net/avatar/${link.mc_uuid}/64`;
            embed.setImage(headUrl);

            logger.debug(`Whois lookup for ${user.tag}: ${link.mc_name}`);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing whois command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while looking up the user.', 
                ephemeral: true 
            });
        }
    }
};
