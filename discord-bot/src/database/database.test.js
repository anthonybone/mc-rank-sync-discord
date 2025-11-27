/**
 * Simple tests for the database module
 * Run with: node --test src/database/database.test.js
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Use a test database
const testDbPath = path.join(__dirname, '../../test-data/test-mcranksync.db');
process.env.DATABASE_PATH = testDbPath;

const database = require('./database');

describe('Database Module', () => {
    before(() => {
        // Ensure test directory exists
        const testDir = path.dirname(testDbPath);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Clean up any existing test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        // Initialize database
        database.initialize();
    });

    after(() => {
        database.close();
        
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('Player Links', () => {
        beforeEach(() => {
            // Clean up links before each test
            const links = database.getAllLinks();
            for (const link of links) {
                database.deleteLinkByMcUuid(link.mc_uuid);
            }
        });

        it('should create a player link', () => {
            database.createLink('test-uuid-1', 'TestPlayer', 'discord-123');
            const link = database.getLinkByMcUuid('test-uuid-1');
            
            assert.ok(link);
            assert.strictEqual(link.mc_uuid, 'test-uuid-1');
            assert.strictEqual(link.mc_name, 'TestPlayer');
            assert.strictEqual(link.discord_id, 'discord-123');
        });

        it('should get link by Discord ID', () => {
            database.createLink('test-uuid-2', 'TestPlayer2', 'discord-456');
            const link = database.getLinkByDiscordId('discord-456');
            
            assert.ok(link);
            assert.strictEqual(link.mc_uuid, 'test-uuid-2');
        });

        it('should delete a player link', () => {
            database.createLink('test-uuid-3', 'TestPlayer3', 'discord-789');
            database.deleteLinkByMcUuid('test-uuid-3');
            
            const link = database.getLinkByMcUuid('test-uuid-3');
            assert.strictEqual(link, undefined);
        });

        it('should update existing link on conflict', () => {
            database.createLink('test-uuid-4', 'OldName', 'old-discord');
            database.createLink('test-uuid-4', 'NewName', 'new-discord');
            
            const link = database.getLinkByMcUuid('test-uuid-4');
            assert.strictEqual(link.mc_name, 'NewName');
            assert.strictEqual(link.discord_id, 'new-discord');
        });
    });

    describe('Rank Mappings', () => {
        beforeEach(() => {
            // Clean up mappings before each test
            const mappings = database.getAllRankMappings();
            for (const mapping of mappings) {
                database.deleteRankMapping(mapping.mc_rank, mapping.discord_role_id);
            }
        });

        it('should create a rank mapping', () => {
            database.createRankMapping('vip', 'role-123');
            const roles = database.getRolesByRank('vip');
            
            assert.strictEqual(roles.length, 1);
            assert.strictEqual(roles[0], 'role-123');
        });

        it('should get all roles for a rank', () => {
            database.createRankMapping('admin', 'role-admin-1');
            database.createRankMapping('admin', 'role-admin-2');
            
            const roles = database.getRolesByRank('admin');
            assert.strictEqual(roles.length, 2);
            assert.ok(roles.includes('role-admin-1'));
            assert.ok(roles.includes('role-admin-2'));
        });

        it('should be case insensitive for rank names', () => {
            database.createRankMapping('MOD', 'role-mod');
            const roles = database.getRolesByRank('mod');
            
            assert.strictEqual(roles.length, 1);
        });

        it('should delete a specific rank mapping', () => {
            database.createRankMapping('helper', 'role-helper-1');
            database.createRankMapping('helper', 'role-helper-2');
            database.deleteRankMapping('helper', 'role-helper-1');
            
            const roles = database.getRolesByRank('helper');
            assert.strictEqual(roles.length, 1);
            assert.strictEqual(roles[0], 'role-helper-2');
        });

        it('should delete all mappings for a rank', () => {
            database.createRankMapping('trial', 'role-trial-1');
            database.createRankMapping('trial', 'role-trial-2');
            database.deleteAllMappingsForRank('trial');
            
            const roles = database.getRolesByRank('trial');
            assert.strictEqual(roles.length, 0);
        });
    });

    describe('Link Codes', () => {
        it('should create and verify a link code', () => {
            const code = database.createLinkCode('discord-link-test');
            assert.ok(code);
            assert.strictEqual(code.length, 6);
            
            const discordId = database.verifyLinkCode(code);
            assert.strictEqual(discordId, 'discord-link-test');
        });

        it('should return null for invalid code', () => {
            const discordId = database.verifyLinkCode('INVALID');
            assert.strictEqual(discordId, null);
        });

        it('should delete code after verification', () => {
            const code = database.createLinkCode('discord-delete-test');
            database.verifyLinkCode(code);
            
            // Second verification should fail
            const discordId = database.verifyLinkCode(code);
            assert.strictEqual(discordId, null);
        });

        it('should replace existing code for same Discord user', () => {
            const code1 = database.createLinkCode('discord-replace-test');
            const code2 = database.createLinkCode('discord-replace-test');
            
            // First code should be invalid
            const result1 = database.verifyLinkCode(code1);
            assert.strictEqual(result1, null);
            
            // Second code should be valid
            const result2 = database.verifyLinkCode(code2);
            assert.strictEqual(result2, 'discord-replace-test');
        });
    });
});
