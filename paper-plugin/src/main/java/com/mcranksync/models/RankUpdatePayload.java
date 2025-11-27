package com.mcranksync.models;

import java.util.List;

/**
 * Payload sent to the Discord bot when a rank update occurs
 */
public class RankUpdatePayload {
    
    private String uuid;
    private String playerName;
    private String primaryGroup;
    private List<String> groups;
    private String eventType;
    private long timestamp;

    public RankUpdatePayload() {
        this.timestamp = System.currentTimeMillis();
    }

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public String getPrimaryGroup() {
        return primaryGroup;
    }

    public void setPrimaryGroup(String primaryGroup) {
        this.primaryGroup = primaryGroup;
    }

    public List<String> getGroups() {
        return groups;
    }

    public void setGroups(List<String> groups) {
        this.groups = groups;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final RankUpdatePayload payload = new RankUpdatePayload();

        public Builder uuid(String uuid) {
            payload.setUuid(uuid);
            return this;
        }

        public Builder playerName(String playerName) {
            payload.setPlayerName(playerName);
            return this;
        }

        public Builder primaryGroup(String primaryGroup) {
            payload.setPrimaryGroup(primaryGroup);
            return this;
        }

        public Builder groups(List<String> groups) {
            payload.setGroups(groups);
            return this;
        }

        public Builder eventType(String eventType) {
            payload.setEventType(eventType);
            return this;
        }

        public RankUpdatePayload build() {
            return payload;
        }
    }
}
