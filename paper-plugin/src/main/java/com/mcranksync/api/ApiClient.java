package com.mcranksync.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.mcranksync.MCRankSync;
import com.mcranksync.models.RankUpdatePayload;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

/**
 * HTTP client for communicating with the Discord bot REST API
 */
public class ApiClient {

    private final MCRankSync plugin;
    private final Gson gson;

    public ApiClient(MCRankSync plugin) {
        this.plugin = plugin;
        this.gson = new GsonBuilder().create();
    }

    /**
     * Send a rank update event to the Discord bot
     */
    public CompletableFuture<ApiResponse> sendRankUpdate(RankUpdatePayload payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return postJson("/api/rank-update", gson.toJson(payload));
            } catch (Exception e) {
                plugin.logError("Failed to send rank update", e);
                return new ApiResponse(false, "Error: " + e.getMessage());
            }
        });
    }

    /**
     * Send a player join event to the Discord bot
     */
    public CompletableFuture<ApiResponse> sendPlayerJoin(RankUpdatePayload payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return postJson("/api/player-join", gson.toJson(payload));
            } catch (Exception e) {
                plugin.logError("Failed to send player join event", e);
                return new ApiResponse(false, "Error: " + e.getMessage());
            }
        });
    }

    /**
     * Link a player's Minecraft account to Discord
     */
    public CompletableFuture<ApiResponse> linkAccount(String uuid, String playerName, String linkCode) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String json = gson.toJson(new LinkRequest(uuid, playerName, linkCode));
                return postJson("/api/link", json);
            } catch (Exception e) {
                plugin.logError("Failed to link account", e);
                return new ApiResponse(false, "Error: " + e.getMessage());
            }
        });
    }

    /**
     * Unlink a player's Minecraft account from Discord
     */
    public CompletableFuture<ApiResponse> unlinkAccount(String uuid) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String json = gson.toJson(new UnlinkRequest(uuid));
                return postJson("/api/unlink", json);
            } catch (Exception e) {
                plugin.logError("Failed to unlink account", e);
                return new ApiResponse(false, "Error: " + e.getMessage());
            }
        });
    }

    /**
     * Check if a player is linked
     */
    public CompletableFuture<ApiResponse> checkLinked(String uuid) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return getJson("/api/linked/" + uuid);
            } catch (Exception e) {
                plugin.logError("Failed to check link status", e);
                return new ApiResponse(false, "Error: " + e.getMessage());
            }
        });
    }

    private ApiResponse postJson(String path, String json) throws IOException {
        String endpoint = plugin.getConfig().getString("api.endpoint", "http://localhost:3000");
        String token = plugin.getConfig().getString("api.token", "");
        int timeout = plugin.getConfig().getInt("api.timeout", 5000);

        URL url = URI.create(endpoint + path).toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        try {
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setConnectTimeout(timeout);
            conn.setReadTimeout(timeout);
            conn.setDoOutput(true);

            if (plugin.getConfig().getBoolean("logging.log-api-calls", false)) {
                plugin.logDebug("POST " + path + " -> " + json);
            }

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = json.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            String responseBody = readResponse(conn, responseCode);

            if (plugin.getConfig().getBoolean("logging.log-api-calls", false)) {
                plugin.logDebug("Response: " + responseCode + " -> " + responseBody);
            }

            return new ApiResponse(responseCode >= 200 && responseCode < 300, responseBody);
        } finally {
            conn.disconnect();
        }
    }

    private ApiResponse getJson(String path) throws IOException {
        String endpoint = plugin.getConfig().getString("api.endpoint", "http://localhost:3000");
        String token = plugin.getConfig().getString("api.token", "");
        int timeout = plugin.getConfig().getInt("api.timeout", 5000);

        URL url = URI.create(endpoint + path).toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        try {
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setConnectTimeout(timeout);
            conn.setReadTimeout(timeout);

            if (plugin.getConfig().getBoolean("logging.log-api-calls", false)) {
                plugin.logDebug("GET " + path);
            }

            int responseCode = conn.getResponseCode();
            String responseBody = readResponse(conn, responseCode);

            if (plugin.getConfig().getBoolean("logging.log-api-calls", false)) {
                plugin.logDebug("Response: " + responseCode + " -> " + responseBody);
            }

            return new ApiResponse(responseCode >= 200 && responseCode < 300, responseBody);
        } finally {
            conn.disconnect();
        }
    }

    private String readResponse(HttpURLConnection conn, int responseCode) {
        try {
            java.io.InputStream is = responseCode >= 200 && responseCode < 300 
                ? conn.getInputStream() 
                : conn.getErrorStream();
            
            if (is == null) {
                return "";
            }

            try (java.io.BufferedReader br = new java.io.BufferedReader(
                    new java.io.InputStreamReader(is, StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
                return response.toString();
            }
        } catch (IOException e) {
            return "Error reading response: " + e.getMessage();
        }
    }

    // Helper classes for JSON serialization
    private static class LinkRequest {
        String uuid;
        String playerName;
        String linkCode;

        LinkRequest(String uuid, String playerName, String linkCode) {
            this.uuid = uuid;
            this.playerName = playerName;
            this.linkCode = linkCode;
        }
    }

    private static class UnlinkRequest {
        String uuid;

        UnlinkRequest(String uuid) {
            this.uuid = uuid;
        }
    }
}
