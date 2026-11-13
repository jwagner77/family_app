package com.jwagner.familytv;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Handles device pairing API communication: requesting device pairing codes,
 * polling for approval from the Family App, and keepalive pings.
 */
public class PairingManager {
    private static final String TAG = "FamilyTV_Pairing";
    private static final MediaType JSON_MEDIA = MediaType.parse("application/json; charset=utf-8");

    public interface RequestCodeCallback {
        void onSuccess(String deviceCode, int expiresInSeconds, String serverName);
        void onError(String message);
    }

    public interface PairingCallback {
        void onPaired(String shareToken, String targetType, String dashboardId, int rotationInterval, String deviceName);
        void onPending(int remainingSeconds);
        void onExpired();
        void onError(String message);
    }

    private final OkHttpClient httpClient;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean isPolling = false;
    private Runnable pollRunnable;

    public PairingManager() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(8, TimeUnit.SECONDS)
                .build();
    }

    public void requestCode(String serverUrl, String deviceName, final RequestCodeCallback callback) {
        String url = serverUrl + "/api/tv/request-code";
        JSONObject bodyJson = new JSONObject();
        try {
            bodyJson.put("device_name", deviceName != null ? deviceName : "Android TV");
        } catch (Exception ignored) {}

        RequestBody body = RequestBody.create(bodyJson.toString(), JSON_MEDIA);
        Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();

        httpClient.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        callback.onError("Connection failed: " + e.getMessage());
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (!response.isSuccessful()) {
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            callback.onError("Server returned code " + response.code());
                        }
                    });
                    return;
                }

                try {
                    String respStr = response.body().string();
                    JSONObject json = new JSONObject(respStr);
                    final String code = json.getString("device_code");
                    final int expiresIn = json.optInt("expires_in_seconds", 900);
                    final String serverName = json.optString("server_name", "Family Hub");

                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            callback.onSuccess(code, expiresIn, serverName);
                        }
                    });
                } catch (Exception e) {
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            callback.onError("Invalid server response: " + e.getMessage());
                        }
                    });
                }
            }
        });
    }

    public void startPolling(final String serverUrl, final String deviceCode, final PairingCallback callback) {
        stopPolling();
        isPolling = true;

        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isPolling) return;

                String url = serverUrl + "/api/tv/poll/" + deviceCode;
                Request request = new Request.Builder()
                        .url(url)
                        .get()
                        .build();

                httpClient.newCall(request).enqueue(new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        if (isPolling) {
                            handler.postDelayed(pollRunnable, 3000);
                        }
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!isPolling) return;

                        if (response.isSuccessful()) {
                            try {
                                String respStr = response.body().string();
                                JSONObject json = new JSONObject(respStr);
                                String status = json.optString("status", "pending");

                                if ("paired".equalsIgnoreCase(status)) {
                                    isPolling = false;
                                    final String shareToken = json.optString("share_token", "");
                                    final String targetType = json.optString("target_type", "single");
                                    final String dashboardId = json.optString("dashboard_id", "default");
                                    final int rotInterval = json.optInt("rotation_interval", 30);
                                    final String devName = json.optString("device_name", "Android TV");

                                    handler.post(new Runnable() {
                                        @Override
                                        public void run() {
                                            callback.onPaired(shareToken, targetType, dashboardId, rotInterval, devName);
                                        }
                                    });
                                    return;
                                } else if ("expired".equalsIgnoreCase(status)) {
                                    isPolling = false;
                                    handler.post(new Runnable() {
                                        @Override
                                        public void run() {
                                            callback.onExpired();
                                        }
                                    });
                                    return;
                                } else {
                                    final int remaining = json.optInt("expires_in_seconds", 900);
                                    handler.post(new Runnable() {
                                        @Override
                                        public void run() {
                                            callback.onPending(remaining);
                                        }
                                    });
                                }
                            } catch (Exception e) {
                                Log.w(TAG, "Error parsing poll response: " + e.getMessage());
                            }
                        }

                        if (isPolling) {
                            handler.postDelayed(pollRunnable, 3000);
                        }
                    }
                });
            }
        };

        handler.post(pollRunnable);
    }

    public void stopPolling() {
        isPolling = false;
        if (pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
            pollRunnable = null;
        }
    }

    public interface PingCallback {
        void onStatusResult(String status, String shareToken, String targetType, String dashboardId, int rotationInterval);
    }

    public void ping(String serverUrl, String deviceCode) {
        ping(serverUrl, deviceCode, null);
    }

    public void ping(String serverUrl, String deviceCode, final PingCallback callback) {
        if (serverUrl == null || serverUrl.isEmpty() || deviceCode == null || deviceCode.isEmpty()) return;
        String url = serverUrl + "/api/tv/ping";
        JSONObject bodyJson = new JSONObject();
        try {
            bodyJson.put("code", deviceCode);
        } catch (Exception ignored) {}

        RequestBody body = RequestBody.create(bodyJson.toString(), JSON_MEDIA);
        Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();

        httpClient.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {}
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                try {
                    if (response.isSuccessful() && callback != null && response.body() != null) {
                        String respStr = response.body().string();
                        JSONObject json = new JSONObject(respStr);
                        final String status = json.optString("status", "paired");
                        final String shareToken = json.optString("share_token", "");
                        final String targetType = json.optString("target_type", "single");
                        final String dashboardId = json.optString("dashboard_id", "default");
                        final int rotInterval = json.optInt("rotation_interval", 30);
                        handler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onStatusResult(status, shareToken, targetType, dashboardId, rotInterval);
                            }
                        });
                    }
                } catch (Exception ignored) {
                } finally {
                    response.close();
                }
            }
        });
    }
}
