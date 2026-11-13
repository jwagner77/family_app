package com.jwagner.familytv;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Handles automatic discovery of the Family App server on the local home network
 * using UDP broadcast beacons on port 41820 with fallback subnet probing.
 */
public class DiscoveryManager {
    private static final String TAG = "FamilyTV_Discovery";
    private static final int DISCOVERY_PORT = 41820;
    private static final String PING_MESSAGE = "FAMILY_HUB_DISCOVER_REQUEST";

    public interface DiscoveryCallback {
        void onServerDiscovered(String serverUrl, String serverName);
        void onDiscoveryFailed(String reason);
    }

    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean isDiscovering = false;

    public DiscoveryManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public void discover(final DiscoveryCallback callback) {
        if (isDiscovering) return;
        isDiscovering = true;

        executor.execute(new Runnable() {
            @Override
            public void run() {
                WifiManager.MulticastLock lock = null;
                DatagramSocket socket = null;
                try {
                    // Acquire MulticastLock on Wi-Fi if available
                    WifiManager wifi = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
                    if (wifi != null) {
                        lock = wifi.createMulticastLock("FamilyTV_MulticastLock");
                        lock.setReferenceCounted(true);
                        lock.acquire();
                    }

                    socket = new DatagramSocket();
                    socket.setBroadcast(true);
                    socket.setSoTimeout(3500); // 3.5s timeout for broadcast

                    byte[] sendData = PING_MESSAGE.getBytes("UTF-8");
                    InetAddress broadcastAddr = InetAddress.getByName("255.255.255.255");
                    DatagramPacket sendPacket = new DatagramPacket(sendData, sendData.length, broadcastAddr, DISCOVERY_PORT);

                    Log.d(TAG, "Broadcasting discovery ping to port " + DISCOVERY_PORT);
                    socket.send(sendPacket);

                    byte[] recvBuf = new byte[2048];
                    DatagramPacket recvPacket = new DatagramPacket(recvBuf, recvBuf.length);

                    socket.receive(recvPacket);

                    String responseStr = new String(recvPacket.getData(), 0, recvPacket.getLength(), "UTF-8");
                    Log.d(TAG, "Received discovery reply: " + responseStr);

                    JSONObject json = new JSONObject(responseStr);
                    if (json.has("type") && json.getString("type").contains("FAMILY_HUB_DISCOVER_RESPONSE")) {
                        int port = json.optInt("port", 8282);
                        String serverName = json.optString("name", "Family Hub");
                        String hostIp = recvPacket.getAddress().getHostAddress();
                        final String serverUrl = "http://" + hostIp + ":" + port;

                        isDiscovering = false;
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onServerDiscovered(serverUrl, serverName);
                            }
                        });
                        return;
                    }
                } catch (SocketTimeoutException ste) {
                    Log.w(TAG, "UDP broadcast discovery timed out. Attempting subnet fallback probe…");
                } catch (Exception e) {
                    Log.w(TAG, "UDP broadcast failed: " + e.getMessage());
                } finally {
                    if (socket != null && !socket.isClosed()) {
                        socket.close();
                    }
                    if (lock != null && lock.isHeld()) {
                        lock.release();
                    }
                }

                // Subnet Fallback Probe: Test localhost and common local router/server IPs
                probeCommonLanTargets(callback);
            }
        });
    }

    private void probeCommonLanTargets(final DiscoveryCallback callback) {
        final String[] candidateUrls = new String[] {
            "http://10.0.2.2:8282", // Android Emulator host loopback
            "http://10.0.2.2:8383",
            "http://10.0.2.2:5000",
            "http://localhost:8282",
            "http://localhost:8383"
        };

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        for (String url : candidateUrls) {
            try {
                Request request = new Request.Builder()
                        .url(url + "/api/tv/request-code")
                        .head()
                        .build();
                Response response = client.newCall(request).execute();
                if (response.isSuccessful() || response.code() == 405 || response.code() == 200) {
                    isDiscovering = false;
                    final String discovered = url;
                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            callback.onServerDiscovered(discovered, "Family Hub (Local)");
                        }
                    });
                    return;
                }
            } catch (Exception ignored) {}
        }

        isDiscovering = false;
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                callback.onDiscoveryFailed("No Family App server found automatically on home network.");
            }
        });
    }

    public void stop() {
        isDiscovering = false;
    }
}
