package com.onemorelevel.myapp;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.AuthenticationResult;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.Player;
import com.google.android.gms.games.leaderboard.LeaderboardScore;
import com.google.android.gms.games.leaderboard.LeaderboardScoreBuffer;
import com.google.android.gms.games.leaderboard.LeaderboardVariant;
import com.google.android.gms.tasks.Task;

/**
 * Bridge to Google Play Games Services v2: sign-in, the player's Play Games
 * name (unique, chosen by the player, tied to their Google account), score
 * submission and leaderboards. Does nothing until a Play Games project ID is
 * configured (see game_services_project_id in app/build.gradle).
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private boolean configured() {
        int id = getContext().getResources().getIdentifier("game_services_project_id", "string", getContext().getPackageName());
        if (id == 0) return false;
        String value = getContext().getString(id);
        return value != null && value.matches("\\d{6,}");
    }

    @Override
    public void load() {
        // v2 signs returning players in automatically once initialised.
        if (configured()) PlayGamesSdk.initialize(getContext());
    }

    private JSObject unavailable() {
        JSObject result = new JSObject();
        result.put("available", false);
        result.put("signedIn", false);
        return result;
    }

    private void resolveWithPlayer(PluginCall call, boolean signedIn) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("signedIn", signedIn);
        if (!signedIn) {
            call.resolve(result);
            return;
        }
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                Player player = task.getResult();
                result.put("playerId", player.getPlayerId());
                result.put("displayName", player.getDisplayName());
            }
            call.resolve(result);
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        if (!configured()) {
            call.resolve(unavailable());
            return;
        }
        PlayGames.getGamesSignInClient(getActivity()).isAuthenticated().addOnCompleteListener(task -> {
            AuthenticationResult auth = task.isSuccessful() ? task.getResult() : null;
            resolveWithPlayer(call, auth != null && auth.isAuthenticated());
        });
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!configured()) {
            call.resolve(unavailable());
            return;
        }
        PlayGames.getGamesSignInClient(getActivity()).signIn().addOnCompleteListener(task -> {
            AuthenticationResult auth = task.isSuccessful() ? task.getResult() : null;
            resolveWithPlayer(call, auth != null && auth.isAuthenticated());
        });
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        Long score = call.getLong("score");
        if (!configured() || leaderboardId == null || score == null) {
            call.resolve();
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity()).submitScore(leaderboardId, score);
        call.resolve();
    }

    @PluginMethod
    public void loadTopScores(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        int max = call.getInt("max", 25);
        if (!configured() || leaderboardId == null) {
            call.reject("unavailable");
            return;
        }
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(getActivity());
        client
            .loadTopScores(leaderboardId, LeaderboardVariant.TIME_SPAN_ALL_TIME, LeaderboardVariant.COLLECTION_PUBLIC, max, true)
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null || task.getResult().get() == null) {
                    call.reject("load_failed");
                    return;
                }
                LeaderboardsClient.LeaderboardScores data = task.getResult().get();
                LeaderboardScoreBuffer buffer = data.getScores();
                JSArray rows = new JSArray();
                try {
                    for (LeaderboardScore s : buffer) rows.put(toRow(s));
                } finally {
                    // Releases the score buffer too.
                    data.release();
                }
                JSObject result = new JSObject();
                result.put("rows", rows);
                client
                    .loadCurrentPlayerLeaderboardScore(leaderboardId, LeaderboardVariant.TIME_SPAN_ALL_TIME, LeaderboardVariant.COLLECTION_PUBLIC)
                    .addOnCompleteListener(mine -> {
                        if (mine.isSuccessful() && mine.getResult() != null && mine.getResult().get() != null) {
                            result.put("me", toRow(mine.getResult().get()));
                        }
                        call.resolve(result);
                    });
            });
    }

    private JSObject toRow(LeaderboardScore s) {
        JSObject row = new JSObject();
        row.put("rank", s.getRank());
        row.put("name", s.getScoreHolderDisplayName());
        row.put("score", s.getRawScore());
        Player holder = s.getScoreHolder();
        if (holder != null) row.put("playerId", holder.getPlayerId());
        return row;
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        if (!configured()) {
            call.reject("unavailable");
            return;
        }
        String leaderboardId = call.getString("leaderboardId");
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(getActivity());
        Task<Intent> intent = leaderboardId == null ? client.getAllLeaderboardsIntent() : client.getLeaderboardIntent(leaderboardId);
        intent
            .addOnSuccessListener(i -> startActivityForResult(call, i, "leaderboardClosed"))
            .addOnFailureListener(e -> call.reject(e.getMessage() == null ? "failed" : e.getMessage()));
    }

    @ActivityCallback
    private void leaderboardClosed(PluginCall call, ActivityResult result) {
        call.resolve();
    }
}
