package com.mcranksync;

import com.mcranksync.api.ApiClient;
import com.mcranksync.commands.MCRankSyncCommand;
import com.mcranksync.listeners.LuckPermsListener;
import com.mcranksync.listeners.PlayerJoinListener;
import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.logging.Level;

/**
 * MCRankSync - Main plugin class
 * Syncs Minecraft ranks to Discord roles via REST API
 */
public class MCRankSync extends JavaPlugin {

    private static MCRankSync instance;
    private LuckPerms luckPerms;
    private ApiClient apiClient;

    @Override
    public void onEnable() {
        instance = this;

        // Save default config
        saveDefaultConfig();

        // Initialize LuckPerms
        if (!initLuckPerms()) {
            getLogger().severe("LuckPerms not found! This plugin requires LuckPerms.");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        // Initialize API client
        apiClient = new ApiClient(this);

        // Register listeners
        getServer().getPluginManager().registerEvents(new PlayerJoinListener(this), this);
        
        // Register LuckPerms event listeners
        new LuckPermsListener(this).register();

        // Register commands
        MCRankSyncCommand commandExecutor = new MCRankSyncCommand(this);
        getCommand("mcranksync").setExecutor(commandExecutor);
        getCommand("mcranksync").setTabCompleter(commandExecutor);

        getLogger().info("MCRankSync has been enabled!");
        logDebug("Debug logging is enabled.");
    }

    @Override
    public void onDisable() {
        getLogger().info("MCRankSync has been disabled!");
    }

    private boolean initLuckPerms() {
        try {
            luckPerms = LuckPermsProvider.get();
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }

    public static MCRankSync getInstance() {
        return instance;
    }

    public LuckPerms getLuckPerms() {
        return luckPerms;
    }

    public ApiClient getApiClient() {
        return apiClient;
    }

    public void logDebug(String message) {
        if (getConfig().getBoolean("logging.debug", false)) {
            getLogger().info("[DEBUG] " + message);
        }
    }

    public void logError(String message, Throwable e) {
        getLogger().log(Level.SEVERE, message, e);
    }

    public String formatMessage(String key) {
        String prefix = getConfig().getString("messages.prefix", "&8[&bMCRankSync&8] &r");
        String message = getConfig().getString("messages." + key, "");
        return colorize(prefix + message);
    }

    public static String colorize(String message) {
        return message.replace("&", "§");
    }
}
