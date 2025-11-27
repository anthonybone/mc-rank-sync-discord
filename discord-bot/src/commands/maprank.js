const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maprank')
        .setDescription('Map a Minecraft rank to a Discord role')
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The Minecraft rank name (from LuckPerms)')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The Discord role to assign')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const rank = interaction.options.getString('rank');
            const role = interaction.options.getRole('role');

            // Check if bot can manage this role
            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Permission Error')
                    .setDescription(`I cannot manage the role **${role.name}** because it is higher than or equal to my highest role.`)
                    .setFooter({ text: 'Move my role above this role in the server settings.' });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check if this mapping already exists
            const existingRoles = database.getRolesByRank(rank);
            if (existingRoles.includes(role.id)) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF9900)
                    .setTitle('⚠️ Mapping Exists')
                    .setDescription(`The rank **${rank}** is already mapped to ${role}.`);
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create the mapping
            database.createRankMapping(rank, role.id);
            
            logger.info(`${interaction.user.tag} mapped rank "${rank}" to role "${role.name}"`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Rank Mapped')
                .setDescription(`Successfully mapped Minecraft rank to Discord role.`)
                .addFields(
                    { name: 'Minecraft Rank', value: `\`${rank}\``, inline: true },
                    { name: 'Discord Role', value: `${role}`, inline: true }
                )
                .setFooter({ text: 'Players with this rank will now receive this role when synced.' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing maprank command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while creating the rank mapping.', 
                ephemeral: true 
            });
        }
    }
};
