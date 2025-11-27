require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const logger = require('./utils/logger');
const database = require('./database/database');
const apiRoutes = require('./api/routes');

// Import commands
const linkCommand = require('./commands/link');
const unlinkCommand = require('./commands/unlink');
const mapRankCommand = require('./commands/maprank');
const unmapRankCommand = require('./commands/unmaprank');
const listMappingsCommand = require('./commands/listmappings');
const whoIsCommand = require('./commands/whois');

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID', 'API_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.error('Please check your .env file or environment configuration.');
    process.exit(1);
}

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize command collection
client.commands = new Collection();

// Register commands
const commands = [
    linkCommand,
    unlinkCommand,
    mapRankCommand,
    unmapRankCommand,
    listMappingsCommand,
    whoIsCommand
];

for (const command of commands) {
    client.commands.set(command.data.name, command);
}

// Handle Discord ready event
client.once('ready', async () => {
    logger.info(`Discord bot logged in as ${client.user.tag}`);

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.info('Registering slash commands...');
        
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands.map(cmd => cmd.data.toJSON()) }
        );
        
        logger.info('Successfully registered slash commands.');
    } catch (error) {
        logger.error('Failed to register slash commands:', error);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command || !command.autocomplete) {
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            logger.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
    }

    try {
        logger.info(`Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error executing this command.';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Initialize Express server for REST API
const app = express();
app.use(express.json());

// Make Discord client available to routes
app.set('discordClient', client);

// Register API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the application
async function start() {
    try {
        // Initialize database
        logger.info('Initializing database...');
        database.initialize();
        logger.info('Database initialized successfully.');

        // Start Express server
        const port = process.env.API_PORT || 3000;
        app.listen(port, () => {
            logger.info(`REST API server listening on port ${port}`);
        });

        // Login to Discord
        logger.info('Connecting to Discord...');
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    client.destroy();
    database.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    client.destroy();
    database.close();
    process.exit(0);
});

start();
