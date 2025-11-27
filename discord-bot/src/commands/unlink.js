const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database/database');
const roleManager = require('../api/roleManager');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your Discord account from your Minecraft account'),

    async execute(interaction) {
        try {
            // Check if user is linked
            const existingLink = database.getLinkByDiscordId(interaction.user.id);
            
            if (!existingLink) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Not Linked')
                    .setDescription('Your Discord account is not linked to any Minecraft account.')
                    .setFooter({ text: 'Use /link to link your account.' });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Remove synced roles
            await roleManager.removeAllSyncedRoles(interaction.client, interaction.user.id);

            // Delete the link
            database.deleteLinkByDiscordId(interaction.user.id);
            
            logger.info(`${interaction.user.tag} unlinked from ${existingLink.mc_name}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Account Unlinked')
                .setDescription(`Your Discord account has been unlinked from **${existingLink.mc_name}**.`)
                .addFields(
                    { name: 'Note', value: 'Any synced roles have been removed.', inline: false }
                )
                .setFooter({ text: 'You can link a different account using /link.' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('Error executing unlink command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while unlinking your account.', 
                ephemeral: true 
            });
        }
    }
};
