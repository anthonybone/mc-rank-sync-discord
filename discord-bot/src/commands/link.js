const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to your Minecraft account'),

    async execute(interaction) {
        try {
            // Check if user is already linked
            const existingLink = database.getLinkByDiscordId(interaction.user.id);
            
            if (existingLink) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF9900)
                    .setTitle('⚠️ Already Linked')
                    .setDescription(`Your Discord account is already linked to **${existingLink.mc_name}**.`)
                    .addFields(
                        { name: 'Minecraft UUID', value: existingLink.mc_uuid, inline: true },
                        { name: 'Linked Since', value: new Date(existingLink.linked_at).toLocaleDateString(), inline: true }
                    )
                    .setFooter({ text: 'Use /unlink first if you want to link a different account.' });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Generate a link code
            const code = database.createLinkCode(interaction.user.id);
            
            logger.info(`Generated link code ${code} for ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🔗 Link Your Account')
                .setDescription('Use the following code in Minecraft to link your account.')
                .addFields(
                    { name: 'Link Code', value: `\`\`\`${code}\`\`\``, inline: false },
                    { name: 'Command', value: `\`\`\`/mcranksync link ${code}\`\`\``, inline: false },
                    { name: '⏰ Expires', value: 'This code expires in **10 minutes**.', inline: false }
                )
                .setFooter({ text: 'Run the command in-game on the Minecraft server.' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('Error executing link command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while generating your link code.', 
                ephemeral: true 
            });
        }
    }
};
