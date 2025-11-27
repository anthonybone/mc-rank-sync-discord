package com.mcranksync.commands;

import com.mcranksync.MCRankSync;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Main command handler for MCRankSync
 */
public class MCRankSyncCommand implements CommandExecutor, TabCompleter {

    private final MCRankSync plugin;
    private static final List<String> SUB_COMMANDS = Arrays.asList("reload", "link", "unlink", "status");

    public MCRankSyncCommand(MCRankSync plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            sendHelp(sender);
            return true;
        }

        String subCommand = args[0].toLowerCase();

        switch (subCommand) {
            case "reload" -> handleReload(sender);
            case "link" -> handleLink(sender, args);
            case "unlink" -> handleUnlink(sender);
            case "status" -> handleStatus(sender);
            default -> sendHelp(sender);
        }

        return true;
    }

    private void handleReload(CommandSender sender) {
        if (!sender.hasPermission("mcranksync.admin")) {
            sender.sendMessage(plugin.formatMessage("no-permission"));
            return;
        }

        plugin.reloadConfig();
        sender.sendMessage(plugin.formatMessage("reload-success"));
        plugin.getLogger().info("Configuration reloaded by " + sender.getName());
    }

    private void handleLink(CommandSender sender, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command can only be used by players.");
            return;
        }

        if (!player.hasPermission("mcranksync.link")) {
            player.sendMessage(plugin.formatMessage("no-permission"));
            return;
        }

        if (args.length < 2) {
            player.sendMessage(MCRankSync.colorize("&cUsage: /mcranksync link <code>"));
            return;
        }

        String linkCode = args[1];

        plugin.getApiClient().linkAccount(
                player.getUniqueId().toString(),
                player.getName(),
                linkCode
        ).thenAccept(response -> {
            if (response.isSuccess()) {
                player.sendMessage(plugin.formatMessage("link-success"));
            } else {
                player.sendMessage(plugin.formatMessage("link-fail"));
            }
        });
    }

    private void handleUnlink(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command can only be used by players.");
            return;
        }

        if (!player.hasPermission("mcranksync.link")) {
            player.sendMessage(plugin.formatMessage("no-permission"));
            return;
        }

        plugin.getApiClient().unlinkAccount(player.getUniqueId().toString())
                .thenAccept(response -> {
                    if (response.isSuccess()) {
                        player.sendMessage(plugin.formatMessage("unlink-success"));
                    } else {
                        player.sendMessage(plugin.formatMessage("unlink-fail"));
                    }
                });
    }

    private void handleStatus(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command can only be used by players.");
            return;
        }

        plugin.getApiClient().checkLinked(player.getUniqueId().toString())
                .thenAccept(response -> {
                    if (response.isSuccess() && response.getMessage().contains("\"linked\":true")) {
                        player.sendMessage(plugin.formatMessage("status-linked"));
                    } else {
                        player.sendMessage(plugin.formatMessage("status-not-linked"));
                    }
                });
    }

    private void sendHelp(CommandSender sender) {
        sender.sendMessage(MCRankSync.colorize("&8&m----------&r &b&lMCRankSync &8&m----------"));
        sender.sendMessage(MCRankSync.colorize("&7/mcranksync link <code> &8- &fLink your Discord account"));
        sender.sendMessage(MCRankSync.colorize("&7/mcranksync unlink &8- &fUnlink your Discord account"));
        sender.sendMessage(MCRankSync.colorize("&7/mcranksync status &8- &fCheck your link status"));
        if (sender.hasPermission("mcranksync.admin")) {
            sender.sendMessage(MCRankSync.colorize("&7/mcranksync reload &8- &fReload configuration"));
        }
        sender.sendMessage(MCRankSync.colorize("&8&m--------------------------------"));
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) {
            return SUB_COMMANDS.stream()
                    .filter(s -> s.startsWith(args[0].toLowerCase()))
                    .filter(s -> {
                        if (s.equals("reload")) {
                            return sender.hasPermission("mcranksync.admin");
                        }
                        return true;
                    })
                    .collect(Collectors.toList());
        }
        return new ArrayList<>();
    }
}
