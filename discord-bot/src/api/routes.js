const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../database/database');
const roleManager = require('./roleManager');

/**
 * Authentication middleware - verifies API token
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn(`Unauthorized API request from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    
    if (token !== process.env.API_TOKEN) {
        logger.warn(`Unauthorized API request from ${req.ip}: Invalid token`);
        return res.status(401).json({ error: 'Unauthorized: Invalid API token' });
    }

    next();
}

/**
 * POST /api/rank-update
 * Handles rank change events from the Minecraft plugin
 */
router.post('/rank-update', authenticate, async (req, res) => {
    try {
        const { uuid, playerName, primaryGroup, groups, eventType, timestamp } = req.body;

        if (!uuid || !playerName) {
            return res.status(400).json({ error: 'Missing required fields: uuid, playerName' });
        }

        logger.info(`Rank update received for ${playerName} (${uuid}): ${eventType}`);
        logger.debug(`Groups: ${JSON.stringify(groups)}, Primary: ${primaryGroup}`);

        // Get Discord client from Express app
        const client = req.app.get('discordClient');
        
        // Check if player is linked
        const link = database.getLinkByMcUuid(uuid);
        
        if (!link) {
            logger.debug(`Player ${playerName} is not linked to a Discord account.`);
            return res.json({ 
                success: true, 
                message: 'Player not linked to Discord',
                linked: false
            });
        }

        // Update Discord roles
        const result = await roleManager.syncRoles(client, link.discord_id, groups || []);
        
        logger.info(`Role sync completed for ${playerName}: ${result.message}`);
        
        res.json({
            success: true,
            message: result.message,
            linked: true,
            rolesAdded: result.rolesAdded,
            rolesRemoved: result.rolesRemoved
        });
    } catch (error) {
        logger.error('Error processing rank update:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/player-join
 * Handles player join events from the Minecraft plugin
 */
router.post('/player-join', authenticate, async (req, res) => {
    try {
        const { uuid, playerName, primaryGroup, groups } = req.body;

        if (!uuid || !playerName) {
            return res.status(400).json({ error: 'Missing required fields: uuid, playerName' });
        }

        logger.info(`Player join received for ${playerName} (${uuid})`);
        logger.debug(`Groups: ${JSON.stringify(groups)}, Primary: ${primaryGroup}`);

        // Get Discord client from Express app
        const client = req.app.get('discordClient');
        
        // Check if player is linked
        const link = database.getLinkByMcUuid(uuid);
        
        if (!link) {
            logger.debug(`Player ${playerName} is not linked to a Discord account.`);
            return res.json({ 
                success: true, 
                message: 'Player not linked to Discord',
                linked: false
            });
        }

        // Update Discord roles on join
        const result = await roleManager.syncRoles(client, link.discord_id, groups || []);
        
        logger.info(`Role sync on join completed for ${playerName}: ${result.message}`);
        
        res.json({
            success: true,
            message: result.message,
            linked: true,
            rolesAdded: result.rolesAdded,
            rolesRemoved: result.rolesRemoved
        });
    } catch (error) {
        logger.error('Error processing player join:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/link
 * Links a Minecraft account to a Discord account using a link code
 */
router.post('/link', authenticate, async (req, res) => {
    try {
        const { uuid, playerName, linkCode } = req.body;

        if (!uuid || !playerName || !linkCode) {
            return res.status(400).json({ error: 'Missing required fields: uuid, playerName, linkCode' });
        }

        logger.info(`Link request received for ${playerName} (${uuid}) with code ${linkCode}`);

        // Verify the link code
        const discordId = database.verifyLinkCode(linkCode);
        
        if (!discordId) {
            logger.warn(`Invalid or expired link code: ${linkCode}`);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or expired link code' 
            });
        }

        // Check if this Minecraft account is already linked to a different Discord account
        const existingLink = database.getLinkByMcUuid(uuid);
        if (existingLink && existingLink.discord_id !== discordId) {
            logger.warn(`Minecraft account ${uuid} is already linked to another Discord account`);
            return res.status(400).json({ 
                success: false, 
                error: 'This Minecraft account is already linked to a different Discord account' 
            });
        }

        // Create the link
        database.createLink(uuid, playerName, discordId);
        
        logger.info(`Successfully linked ${playerName} (${uuid}) to Discord ID ${discordId}`);
        
        res.json({ 
            success: true, 
            message: 'Account linked successfully',
            discordId: discordId
        });
    } catch (error) {
        logger.error('Error processing link request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/unlink
 * Unlinks a Minecraft account from Discord
 */
router.post('/unlink', authenticate, async (req, res) => {
    try {
        const { uuid } = req.body;

        if (!uuid) {
            return res.status(400).json({ error: 'Missing required field: uuid' });
        }

        logger.info(`Unlink request received for ${uuid}`);

        // Get the link to retrieve Discord ID for role removal
        const link = database.getLinkByMcUuid(uuid);
        
        if (!link) {
            return res.status(404).json({ 
                success: false, 
                error: 'Account not linked' 
            });
        }

        // Remove all synced roles from the Discord user
        const client = req.app.get('discordClient');
        await roleManager.removeAllSyncedRoles(client, link.discord_id);

        // Delete the link
        database.deleteLinkByMcUuid(uuid);
        
        logger.info(`Successfully unlinked ${uuid}`);
        
        res.json({ 
            success: true, 
            message: 'Account unlinked successfully'
        });
    } catch (error) {
        logger.error('Error processing unlink request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/linked/:uuid
 * Checks if a Minecraft account is linked
 */
router.get('/linked/:uuid', authenticate, (req, res) => {
    try {
        const { uuid } = req.params;

        const link = database.getLinkByMcUuid(uuid);
        
        if (link) {
            res.json({ 
                linked: true, 
                discordId: link.discord_id,
                linkedAt: link.linked_at
            });
        } else {
            res.json({ linked: false });
        }
    } catch (error) {
        logger.error('Error checking link status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
