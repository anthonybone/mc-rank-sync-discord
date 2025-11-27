const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmaprank')
        .setDescription('Remove a Minecraft rank to Discord role mapping')
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The Minecraft rank name')
                .setRequired(true)
                .setAutocomplete(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The Discord role (leave empty to remove all mappings for this rank)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const rank = interaction.options.getString('rank');
            const role = interaction.options.getRole('role');

            if (role) {
                // Remove specific mapping
                const result = database.deleteRankMapping(rank, role.id);
                
                if (result.changes === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Mapping Not Found')
                        .setDescription(`No mapping exists between rank **${rank}** and role ${role}.`);
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                logger.info(`${interaction.user.tag} removed mapping: "${rank}" -> "${role.name}"`);

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Mapping Removed')
                    .setDescription(`Removed mapping between **${rank}** and ${role}.`);

                await interaction.reply({ embeds: [embed] });
            } else {
                // Remove all mappings for this rank
                const result = database.deleteAllMappingsForRank(rank);
                
                if (result.changes === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ No Mappings Found')
                        .setDescription(`No mappings exist for rank **${rank}**.`);
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                logger.info(`${interaction.user.tag} removed all mappings for rank "${rank}"`);

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Mappings Removed')
                    .setDescription(`Removed **${result.changes}** mapping(s) for rank **${rank}**.`);

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            logger.error('Error executing unmaprank command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while removing the rank mapping.', 
                ephemeral: true 
            });
        }
    },

    // Handle autocomplete for rank names
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const ranks = database.getMappedRanks();
        
        const filtered = ranks
            .filter(rank => rank.toLowerCase().includes(focusedValue))
            .slice(0, 25);
        
        await interaction.respond(
            filtered.map(rank => ({ name: rank, value: rank }))
        );
    }
};
