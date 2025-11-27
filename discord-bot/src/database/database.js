const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/mcranksync.db');

let db = null;

/**
 * Initialize the database and create tables if they don't exist
 */
function initialize() {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
        -- Player links table: maps Minecraft UUIDs to Discord user IDs
        CREATE TABLE IF NOT EXISTS player_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mc_uuid TEXT UNIQUE NOT NULL,
            mc_name TEXT NOT NULL,
            discord_id TEXT UNIQUE NOT NULL,
            linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Rank mappings table: maps Minecraft ranks to Discord roles
        CREATE TABLE IF NOT EXISTS rank_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mc_rank TEXT NOT NULL,
            discord_role_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(mc_rank, discord_role_id)
        );

        -- Link codes table: temporary codes for account linking
        CREATE TABLE IF NOT EXISTS link_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discord_id TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL
        );

        -- Create indexes for frequently queried columns
        CREATE INDEX IF NOT EXISTS idx_player_links_mc_uuid ON player_links(mc_uuid);
        CREATE INDEX IF NOT EXISTS idx_player_links_discord_id ON player_links(discord_id);
        CREATE INDEX IF NOT EXISTS idx_rank_mappings_mc_rank ON rank_mappings(mc_rank);
        CREATE INDEX IF NOT EXISTS idx_link_codes_code ON link_codes(code);
    `);

    logger.info(`Database initialized at ${dbPath}`);
}

/**
 * Close the database connection
 */
function close() {
    if (db) {
        db.close();
        logger.info('Database connection closed.');
    }
}

// ==================== Player Links ====================

/**
 * Create a new player link
 */
function createLink(mcUuid, mcName, discordId) {
    const stmt = db.prepare(`
        INSERT INTO player_links (mc_uuid, mc_name, discord_id)
        VALUES (?, ?, ?)
        ON CONFLICT(mc_uuid) DO UPDATE SET 
            mc_name = excluded.mc_name,
            discord_id = excluded.discord_id,
            updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(mcUuid, mcName, discordId);
}

/**
 * Get a player link by Minecraft UUID
 */
function getLinkByMcUuid(mcUuid) {
    const stmt = db.prepare('SELECT * FROM player_links WHERE mc_uuid = ?');
    return stmt.get(mcUuid);
}

/**
 * Get a player link by Discord ID
 */
function getLinkByDiscordId(discordId) {
    const stmt = db.prepare('SELECT * FROM player_links WHERE discord_id = ?');
    return stmt.get(discordId);
}

/**
 * Delete a player link by Minecraft UUID
 */
function deleteLinkByMcUuid(mcUuid) {
    const stmt = db.prepare('DELETE FROM player_links WHERE mc_uuid = ?');
    return stmt.run(mcUuid);
}

/**
 * Delete a player link by Discord ID
 */
function deleteLinkByDiscordId(discordId) {
    const stmt = db.prepare('DELETE FROM player_links WHERE discord_id = ?');
    return stmt.run(discordId);
}

/**
 * Get all player links
 */
function getAllLinks() {
    const stmt = db.prepare('SELECT * FROM player_links ORDER BY linked_at DESC');
    return stmt.all();
}

// ==================== Rank Mappings ====================

/**
 * Create a rank mapping
 */
function createRankMapping(mcRank, discordRoleId) {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO rank_mappings (mc_rank, discord_role_id)
        VALUES (?, ?)
    `);
    return stmt.run(mcRank.toLowerCase(), discordRoleId);
}

/**
 * Get Discord role IDs for a Minecraft rank
 */
function getRolesByRank(mcRank) {
    const stmt = db.prepare('SELECT discord_role_id FROM rank_mappings WHERE mc_rank = ?');
    return stmt.all(mcRank.toLowerCase()).map(row => row.discord_role_id);
}

/**
 * Get all rank mappings
 */
function getAllRankMappings() {
    const stmt = db.prepare('SELECT * FROM rank_mappings ORDER BY mc_rank');
    return stmt.all();
}

/**
 * Delete a rank mapping
 */
function deleteRankMapping(mcRank, discordRoleId) {
    const stmt = db.prepare('DELETE FROM rank_mappings WHERE mc_rank = ? AND discord_role_id = ?');
    return stmt.run(mcRank.toLowerCase(), discordRoleId);
}

/**
 * Delete all mappings for a Minecraft rank
 */
function deleteAllMappingsForRank(mcRank) {
    const stmt = db.prepare('DELETE FROM rank_mappings WHERE mc_rank = ?');
    return stmt.run(mcRank.toLowerCase());
}

/**
 * Get all unique Minecraft ranks that have mappings
 */
function getMappedRanks() {
    const stmt = db.prepare('SELECT DISTINCT mc_rank FROM rank_mappings ORDER BY mc_rank');
    return stmt.all().map(row => row.mc_rank);
}

// ==================== Link Codes ====================

/**
 * Create a link code for a Discord user
 */
function createLinkCode(discordId) {
    // Delete any existing code for this Discord user
    deleteLinkCodeByDiscordId(discordId);

    // Generate a random 6-character code
    const code = generateCode();
    
    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
        INSERT INTO link_codes (code, discord_id, expires_at)
        VALUES (?, ?, ?)
    `);
    stmt.run(code, discordId, expiresAt);

    return code;
}

/**
 * Verify a link code and return the Discord ID if valid
 */
function verifyLinkCode(code) {
    const stmt = db.prepare(`
        SELECT discord_id FROM link_codes 
        WHERE code = ? AND expires_at > datetime('now')
    `);
    const result = stmt.get(code);
    
    if (result) {
        // Delete the code after use
        deleteLinkCode(code);
        return result.discord_id;
    }
    
    return null;
}

/**
 * Delete a link code
 */
function deleteLinkCode(code) {
    const stmt = db.prepare('DELETE FROM link_codes WHERE code = ?');
    return stmt.run(code);
}

/**
 * Delete a link code by Discord ID
 */
function deleteLinkCodeByDiscordId(discordId) {
    const stmt = db.prepare('DELETE FROM link_codes WHERE discord_id = ?');
    return stmt.run(discordId);
}

/**
 * Clean up expired link codes
 */
function cleanupExpiredCodes() {
    const stmt = db.prepare("DELETE FROM link_codes WHERE expires_at <= datetime('now')");
    const result = stmt.run();
    if (result.changes > 0) {
        logger.debug(`Cleaned up ${result.changes} expired link codes.`);
    }
    return result;
}

/**
 * Generate a random 6-character alphanumeric code
 * Uses cryptographically secure random number generation
 */
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const crypto = require('crypto');
    let code = '';
    for (let i = 0; i < 6; i++) {
        // Use randomInt for unbiased random selection
        code += chars[crypto.randomInt(0, chars.length)];
    }
    return code;
}

module.exports = {
    initialize,
    close,
    // Player links
    createLink,
    getLinkByMcUuid,
    getLinkByDiscordId,
    deleteLinkByMcUuid,
    deleteLinkByDiscordId,
    getAllLinks,
    // Rank mappings
    createRankMapping,
    getRolesByRank,
    getAllRankMappings,
    deleteRankMapping,
    deleteAllMappingsForRank,
    getMappedRanks,
    // Link codes
    createLinkCode,
    verifyLinkCode,
    deleteLinkCode,
    cleanupExpiredCodes
};
