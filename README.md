# MC Rank Sync Discord

Minecraft Rank→Discord Role Sync system. A Paper plugin that detects LuckPerms rank changes and sends updates to a Discord bot. The bot maps ranks to Discord roles, assigns roles automatically, and supports slash commands with SQLite storage. Perfect for server automation and role consistency.

## Features

### Paper Plugin
- 🔗 Links Minecraft UUIDs to Discord accounts
- 📡 Sends rank-change events to Discord bot via REST API
- 📡 Sends player join events to sync roles on login
- ⚙️ Configurable API endpoint and authentication
- 🔒 Secure token-based API authentication
- 📝 Detailed logging with debug mode

### Discord Bot
- 🤖 Slash commands for easy management
- 🗄️ SQLite database for persistent storage
- 🔄 Automatic role sync on rank changes
- 🔐 Secure API token verification
- 📋 Rank→Role mapping management
- 👤 Account linking with temporary codes

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Minecraft Server  │         │    Discord Server   │
│   ┌─────────────┐   │         │   ┌─────────────┐   │
│   │ Paper Plugin│   │ ──────► │   │ Discord Bot │   │
│   │ + LuckPerms │   │  HTTP   │   │ + REST API  │   │
│   └─────────────┘   │  POST   │   └─────────────┘   │
└─────────────────────┘         └─────────────────────┘
```

## Installation

### Prerequisites
- Java 17+ (for Minecraft server)
- Node.js 18+ (for Discord bot)
- Paper server 1.20.4+
- LuckPerms plugin installed
- Discord bot application created

### Discord Bot Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token
   - Enable "Server Members Intent" in the Bot settings

2. **Invite the Bot**
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Manage Roles`
   - Use the generated URL to invite the bot to your server

3. **Configure the Bot**
   ```bash
   cd discord-bot
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_GUILD_ID=your_server_id
   API_TOKEN=generate_a_secure_random_string
   API_PORT=3000
   ```

4. **Install Dependencies and Start**
   ```bash
   npm install
   npm start
   ```

### Paper Plugin Setup

1. **Build the Plugin**
   ```bash
   cd paper-plugin
   mvn package
   ```
   
   The JAR file will be in `target/mc-rank-sync-1.0.0.jar`

2. **Install the Plugin**
   - Copy the JAR to your server's `plugins/` folder
   - Ensure LuckPerms is installed
   - Restart the server

3. **Configure the Plugin**
   
   Edit `plugins/MCRankSync/config.yml`:
   ```yaml
   api:
     endpoint: "http://your-bot-server:3000"
     token: "same_token_as_discord_bot"
     timeout: 5000

   sync:
     on-join: true
     on-rank-change: true
     require-linked: true
   ```

## Usage

### Discord Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/link` | Generate a link code to connect your Discord and Minecraft accounts | Everyone |
| `/unlink` | Unlink your Discord account from Minecraft | Everyone |
| `/maprank <rank> <role>` | Map a Minecraft rank to a Discord role | Administrator |
| `/unmaprank <rank> [role]` | Remove a rank mapping | Administrator |
| `/listmappings` | Show all rank→role mappings | Administrator |
| `/whois <user>` | Look up who a Discord user is linked to | Administrator |

### Minecraft Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/mcranksync link <code>` | Link your Minecraft account using a Discord code | mcranksync.link |
| `/mcranksync unlink` | Unlink your Minecraft account | mcranksync.link |
| `/mcranksync status` | Check your link status | mcranksync.link |
| `/mcranksync reload` | Reload the plugin configuration | mcranksync.admin |

### Workflow Example

1. **Setup Rank Mappings (Admin)**
   ```
   /maprank vip @VIP
   /maprank moderator @Moderator
   /maprank admin @Admin
   ```

2. **Player Links Account**
   - Player runs `/link` in Discord → receives a code like `ABC123`
   - Player runs `/mcranksync link ABC123` in Minecraft
   - Account is now linked!

3. **Automatic Sync**
   - When the player joins Minecraft, their Discord roles are synced
   - When their LuckPerms rank changes, Discord roles update automatically
   - When they unlink, synced roles are removed

## Configuration

### Discord Bot `.env`

```env
# Required
DISCORD_TOKEN=       # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=   # Application client ID
DISCORD_GUILD_ID=    # Server ID where bot operates
API_TOKEN=           # Shared secret for Minecraft plugin auth

# Optional
API_PORT=3000        # REST API port (default: 3000)
LOG_LEVEL=info       # Log level: error, warn, info, debug
LOG_FILE=            # Path to log file (optional)
DATABASE_PATH=       # SQLite database path (default: ./data/mcranksync.db)
```

### Paper Plugin `config.yml`

```yaml
api:
  endpoint: "http://localhost:3000"  # Discord bot REST API URL
  token: "your-api-token-here"       # Must match Discord bot API_TOKEN
  timeout: 5000                      # Connection timeout in ms

sync:
  on-join: true          # Sync roles when player joins
  on-rank-change: true   # Sync roles when LuckPerms group changes
  require-linked: true   # Only sync linked players

logging:
  debug: false           # Enable debug logging
  log-api-calls: true    # Log API requests/responses

messages:
  prefix: "&8[&bMCRankSync&8] &r"
  # ... customize messages as needed
```

## API Endpoints

The Discord bot exposes a REST API for the Minecraft plugin:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rank-update` | POST | Handle rank change events |
| `/api/player-join` | POST | Handle player join events |
| `/api/link` | POST | Link Minecraft to Discord account |
| `/api/unlink` | POST | Unlink accounts |
| `/api/linked/:uuid` | GET | Check if player is linked |
| `/health` | GET | Health check endpoint |

All API endpoints (except `/health`) require the `Authorization: Bearer <token>` header.

## Security Considerations

- Generate a strong, random API token (at least 32 characters)
- Keep the API token secret and don't commit it to version control
- The Discord bot should ideally run on the same network as the Minecraft server
- If exposing the API publicly, use HTTPS with a reverse proxy
- Regularly rotate API tokens

## Troubleshooting

### Common Issues

**Bot not responding to commands**
- Ensure the bot has been invited with correct permissions
- Check if slash commands are registered (check logs)
- Verify GUILD_ID is correct

**Roles not being assigned**
- Ensure the bot's role is higher than roles it needs to manage
- Check if rank mappings are configured correctly
- Verify the player is linked

**Plugin can't connect to bot**
- Check the API endpoint URL is correct
- Verify API tokens match on both sides
- Ensure firewall allows connections

### Debug Mode

Enable debug logging for more information:

**Discord Bot:**
```env
LOG_LEVEL=debug
```

**Paper Plugin:**
```yaml
logging:
  debug: true
  log-api-calls: true
```

## Development

### Building from Source

**Discord Bot:**
```bash
cd discord-bot
npm install
npm start
```

**Paper Plugin:**
```bash
cd paper-plugin
mvn clean package
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- [LuckPerms](https://luckperms.net/) - Permission management
- [Paper](https://papermc.io/) - Minecraft server software
- [discord.js](https://discord.js.org/) - Discord API wrapper

