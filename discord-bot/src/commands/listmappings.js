const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listmappings')
        .setDescription('List all Minecraft rank to Discord role mappings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const mappings = database.getAllRankMappings();

            if (mappings.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF9900)
                    .setTitle('📋 Rank Mappings')
                    .setDescription('No rank mappings have been configured yet.')
                    .setFooter({ text: 'Use /maprank to create a mapping.' });
                
                return interaction.reply({ embeds: [embed] });
            }

            // Group mappings by rank
            const groupedMappings = {};
            for (const mapping of mappings) {
                if (!groupedMappings[mapping.mc_rank]) {
                    groupedMappings[mapping.mc_rank] = [];
                }
                groupedMappings[mapping.mc_rank].push(mapping.discord_role_id);
            }

            // Build the description
            const lines = [];
            for (const [rank, roleIds] of Object.entries(groupedMappings)) {
                const roleList = roleIds.map(id => `<@&${id}>`).join(', ');
                lines.push(`**${rank}** → ${roleList}`);
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 Rank Mappings')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: 'Total Mappings', value: `${mappings.length}`, inline: true },
                    { name: 'Unique Ranks', value: `${Object.keys(groupedMappings).length}`, inline: true }
                )
                .setFooter({ text: 'Use /maprank to add or /unmaprank to remove mappings.' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing listmappings command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while fetching the rank mappings.', 
                ephemeral: true 
            });
        }
    }
};
