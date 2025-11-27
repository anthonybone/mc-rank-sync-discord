const logger = require('../utils/logger');
const database = require('../database/database');

/**
 * Sync Discord roles based on Minecraft groups
 * @param {Client} client - Discord client
 * @param {string} discordId - Discord user ID
 * @param {string[]} mcGroups - Array of Minecraft group names
 * @returns {Object} Result with rolesAdded and rolesRemoved arrays
 */
async function syncRoles(client, discordId, mcGroups) {
    const result = {
        success: true,
        message: 'Roles synced',
        rolesAdded: [],
        rolesRemoved: []
    };

    try {
        // Get the guild
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
        if (!guild) {
            logger.error(`Guild ${process.env.DISCORD_GUILD_ID} not found`);
            result.success = false;
            result.message = 'Guild not found';
            return result;
        }

        // Get the member
        let member;
        try {
            member = await guild.members.fetch(discordId);
        } catch {
            logger.warn(`Discord member ${discordId} not found in guild`);
            result.success = false;
            result.message = 'Discord member not found in guild';
            return result;
        }

        // Get all mapped Discord role IDs
        const allMappings = database.getAllRankMappings();
        const allMappedRoleIds = new Set(allMappings.map(m => m.discord_role_id));

        // Get roles that should be assigned based on current MC groups
        const targetRoleIds = new Set();
        for (const group of mcGroups) {
            const roleIds = database.getRolesByRank(group);
            roleIds.forEach(id => targetRoleIds.add(id));
        }

        // Get current mapped roles the member has
        const currentMappedRoleIds = new Set(
            member.roles.cache
                .filter(role => allMappedRoleIds.has(role.id))
                .map(role => role.id)
        );

        // Determine roles to add (in target but not current)
        const rolesToAdd = [...targetRoleIds].filter(id => !currentMappedRoleIds.has(id));

        // Determine roles to remove (in current but not target, and is a mapped role)
        const rolesToRemove = [...currentMappedRoleIds].filter(id => !targetRoleIds.has(id));

        // Add roles
        for (const roleId of rolesToAdd) {
            try {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.add(role);
                    result.rolesAdded.push(role.name);
                    logger.debug(`Added role ${role.name} to ${member.user.tag}`);
                } else {
                    logger.warn(`Role ${roleId} not found in guild`);
                }
            } catch (error) {
                logger.error(`Failed to add role ${roleId} to ${member.user.tag}:`, error);
            }
        }

        // Remove roles
        for (const roleId of rolesToRemove) {
            try {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.remove(role);
                    result.rolesRemoved.push(role.name);
                    logger.debug(`Removed role ${role.name} from ${member.user.tag}`);
                }
            } catch (error) {
                logger.error(`Failed to remove role ${roleId} from ${member.user.tag}:`, error);
            }
        }

        if (result.rolesAdded.length > 0 || result.rolesRemoved.length > 0) {
            result.message = `Roles updated: +${result.rolesAdded.length} -${result.rolesRemoved.length}`;
        } else {
            result.message = 'No role changes needed';
        }

        return result;
    } catch (error) {
        logger.error('Error syncing roles:', error);
        result.success = false;
        result.message = error.message;
        return result;
    }
}

/**
 * Remove all synced roles from a Discord user
 * @param {Client} client - Discord client
 * @param {string} discordId - Discord user ID
 */
async function removeAllSyncedRoles(client, discordId) {
    try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
        if (!guild) {
            logger.error(`Guild ${process.env.DISCORD_GUILD_ID} not found`);
            return;
        }

        let member;
        try {
            member = await guild.members.fetch(discordId);
        } catch {
            logger.warn(`Discord member ${discordId} not found in guild for role removal`);
            return;
        }

        // Get all mapped role IDs
        const allMappings = database.getAllRankMappings();
        const mappedRoleIds = new Set(allMappings.map(m => m.discord_role_id));

        // Remove all mapped roles from the member
        for (const role of member.roles.cache.values()) {
            if (mappedRoleIds.has(role.id)) {
                try {
                    await member.roles.remove(role);
                    logger.debug(`Removed role ${role.name} from ${member.user.tag} during unlink`);
                } catch (error) {
                    logger.error(`Failed to remove role ${role.name} from ${member.user.tag}:`, error);
                }
            }
        }

        logger.info(`Removed all synced roles from ${member.user.tag}`);
    } catch (error) {
        logger.error('Error removing synced roles:', error);
    }
}

module.exports = {
    syncRoles,
    removeAllSyncedRoles
};
