package com.mcranksync.listeners;

import com.mcranksync.MCRankSync;
import com.mcranksync.models.RankUpdatePayload;
import net.luckperms.api.model.user.User;
import net.luckperms.api.node.types.InheritanceNode;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Listens for player join events and sends rank data to the Discord bot
 */
public class PlayerJoinListener implements Listener {

    private final MCRankSync plugin;

    public PlayerJoinListener(MCRankSync plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (!plugin.getConfig().getBoolean("sync.on-join", true)) {
            return;
        }

        Player player = event.getPlayer();

        // Use async to get LuckPerms data
        plugin.getLuckPerms().getUserManager().loadUser(player.getUniqueId())
                .thenAccept(user -> {
                    if (user == null) {
                        plugin.logDebug("Could not load LuckPerms user for " + player.getName());
                        return;
                    }

                    sendJoinUpdate(player, user);
                });
    }

    private void sendJoinUpdate(Player player, User user) {
        // Get all groups for the user
        List<String> groups = user.getNodes().stream()
                .filter(node -> node instanceof InheritanceNode)
                .map(node -> ((InheritanceNode) node).getGroupName())
                .collect(Collectors.toList());

        String primaryGroup = user.getPrimaryGroup();

        RankUpdatePayload payload = RankUpdatePayload.builder()
                .uuid(player.getUniqueId().toString())
                .playerName(player.getName())
                .primaryGroup(primaryGroup)
                .groups(groups)
                .eventType("PLAYER_JOIN")
                .build();

        plugin.logDebug("Sending player join event for " + player.getName() + " with groups: " + groups);

        plugin.getApiClient().sendPlayerJoin(payload)
                .thenAccept(response -> {
                    if (response.isSuccess()) {
                        plugin.logDebug("Player join event sent successfully for " + player.getName());
                    } else {
                        plugin.getLogger().warning("Failed to send player join event for " + player.getName() + ": " + response.getMessage());
                    }
                });
    }
}
