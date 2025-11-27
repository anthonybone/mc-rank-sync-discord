package com.mcranksync.listeners;

import com.mcranksync.MCRankSync;
import com.mcranksync.models.RankUpdatePayload;
import net.luckperms.api.event.EventBus;
import net.luckperms.api.event.node.NodeAddEvent;
import net.luckperms.api.event.node.NodeRemoveEvent;
import net.luckperms.api.model.user.User;
import net.luckperms.api.node.types.InheritanceNode;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Listens for LuckPerms group/permission changes and sends updates to the Discord bot
 */
public class LuckPermsListener {

    private final MCRankSync plugin;

    public LuckPermsListener(MCRankSync plugin) {
        this.plugin = plugin;
    }

    public void register() {
        EventBus eventBus = plugin.getLuckPerms().getEventBus();

        // Listen for group additions
        eventBus.subscribe(plugin, NodeAddEvent.class, this::onNodeAdd);

        // Listen for group removals
        eventBus.subscribe(plugin, NodeRemoveEvent.class, this::onNodeRemove);

        plugin.getLogger().info("LuckPerms event listeners registered.");
    }

    private void onNodeAdd(NodeAddEvent event) {
        if (!plugin.getConfig().getBoolean("sync.on-rank-change", true)) {
            return;
        }

        if (!(event.getTarget() instanceof User user)) {
            return;
        }

        // Only process inheritance (group) nodes
        if (!(event.getNode() instanceof InheritanceNode inheritanceNode)) {
            return;
        }

        String groupName = inheritanceNode.getGroupName();
        plugin.logDebug("Group added for " + user.getUsername() + ": " + groupName);

        sendRankUpdate(user, "GROUP_ADD");
    }

    private void onNodeRemove(NodeRemoveEvent event) {
        if (!plugin.getConfig().getBoolean("sync.on-rank-change", true)) {
            return;
        }

        if (!(event.getTarget() instanceof User user)) {
            return;
        }

        // Only process inheritance (group) nodes
        if (!(event.getNode() instanceof InheritanceNode inheritanceNode)) {
            return;
        }

        String groupName = inheritanceNode.getGroupName();
        plugin.logDebug("Group removed for " + user.getUsername() + ": " + groupName);

        sendRankUpdate(user, "GROUP_REMOVE");
    }

    private void sendRankUpdate(User user, String eventType) {
        // Get all groups for the user
        List<String> groups = user.getNodes().stream()
                .filter(node -> node instanceof InheritanceNode)
                .map(node -> ((InheritanceNode) node).getGroupName())
                .collect(Collectors.toList());

        String primaryGroup = user.getPrimaryGroup();
        String playerName = user.getUsername() != null ? user.getUsername() : "Unknown";

        RankUpdatePayload payload = RankUpdatePayload.builder()
                .uuid(user.getUniqueId().toString())
                .playerName(playerName)
                .primaryGroup(primaryGroup)
                .groups(groups)
                .eventType(eventType)
                .build();

        plugin.getApiClient().sendRankUpdate(payload)
                .thenAccept(response -> {
                    if (response.isSuccess()) {
                        plugin.logDebug("Rank update sent successfully for " + playerName);
                    } else {
                        plugin.getLogger().warning("Failed to send rank update for " + playerName + ": " + response.getMessage());
                    }
                });
    }
}
