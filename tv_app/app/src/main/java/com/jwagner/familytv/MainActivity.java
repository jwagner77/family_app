package com.jwagner.familytv;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity implements OverlayMenuDialog.MenuActionListener {

    private TvPreferences preferences;
    private DiscoveryManager discoveryManager;
    private PairingManager pairingManager;
    private BurnInProtector burnInProtector;

    private FrameLayout rootLayout;
    private FrameLayout dashboardContainer;
    private LinearLayout pairingContainer;
    private WebView dashboardWebView;
    private TextView tvClock;
    private TextView statusServerText;
    private TextView pairingCodeDisplay;
    private TextView pairingCountdown;
    private ProgressBar pairingProgress;
    private Button btnRefreshCode;
    private Button btnManualServer;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final SimpleDateFormat clockFormat = new SimpleDateFormat("h:mm a", Locale.getDefault());
    private Runnable clockRunnable;
    private Runnable pingRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep TV screen awake while app is active in foreground
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_main);

        preferences = new TvPreferences(this);
        discoveryManager = new DiscoveryManager(this);
        pairingManager = new PairingManager();

        bindViews();
        setupClock();
        setupWebView();

        if (preferences.isPaired()) {
            showDashboard();
        } else {
            showPairingScreen();
            startDiscoveryAndPairing();
        }
    }

    private void bindViews() {
        rootLayout = findViewById(R.id.root_layout);
        dashboardContainer = findViewById(R.id.dashboard_container);
        pairingContainer = findViewById(R.id.pairing_container);
        dashboardWebView = findViewById(R.id.dashboard_webview);
        tvClock = findViewById(R.id.tv_clock);
        statusServerText = findViewById(R.id.status_server_text);
        pairingCodeDisplay = findViewById(R.id.pairing_code_display);
        pairingCountdown = findViewById(R.id.pairing_countdown);
        pairingProgress = findViewById(R.id.pairing_progress);
        btnRefreshCode = findViewById(R.id.btn_refresh_code);
        btnManualServer = findViewById(R.id.btn_manual_server);

        btnRefreshCode.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                requestNewPairingCode();
            }
        });

        btnManualServer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showManualServerDialog();
            }
        });
    }

    private void setupClock() {
        clockRunnable = new Runnable() {
            @Override
            public void run() {
                if (tvClock != null) {
                    tvClock.setText(clockFormat.format(new Date()));
                }
                mainHandler.postDelayed(this, 10_000L);
            }
        };
        mainHandler.post(clockRunnable);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = dashboardWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setLoadsImagesAutomatically(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // TV 10-foot UI Optimization: Set viewport & desktop-like high density zoom
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUserAgentString(webSettings.getUserAgentString() + " FamilyHubTV/1.0 (Android TV Leanback)");

        dashboardWebView.setWebChromeClient(new WebChromeClient());
        dashboardWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject 10-foot TV styles: padding for overscan safe area, clean typography, hide scrollbars
                String tvStyleJs = "javascript:(function() {" +
                        "  var style = document.createElement('style');" +
                        "  style.innerHTML = '::-webkit-scrollbar { display: none !important; } body { padding: 24px 32px !important; box-sizing: border-box !important; user-select: none !important; }';" +
                        "  document.head.appendChild(style);" +
                        "})()";
                view.evaluateJavascript(tvStyleJs, null);
            }
        });

        // Setup burn-in protection on dashboard container
        burnInProtector = new BurnInProtector(dashboardWebView);
    }

    private void startDiscoveryAndPairing() {
        String existingServerUrl = preferences.getServerUrl();
        if (existingServerUrl != null && !existingServerUrl.isEmpty()) {
            statusServerText.setText("Connecting to saved server: " + existingServerUrl);
            requestNewPairingCode();
            return;
        }

        statusServerText.setText("Searching for Family App on home network…");
        pairingProgress.setVisibility(View.VISIBLE);

        discoveryManager.discover(new DiscoveryManager.DiscoveryCallback() {
            @Override
            public void onServerDiscovered(String serverUrl, String serverName) {
                preferences.setServerUrl(serverUrl);
                preferences.setServerName(serverName);
                statusServerText.setText("Discovered: " + serverName + " (" + serverUrl + ")");
                requestNewPairingCode();
            }

            @Override
            public void onDiscoveryFailed(String reason) {
                statusServerText.setText(reason + " You can configure server URL manually.");
                pairingProgress.setVisibility(View.GONE);
                btnManualServer.requestFocus();
            }
        });
    }

    private void requestNewPairingCode() {
        final String serverUrl = preferences.getServerUrl();
        if (serverUrl == null || serverUrl.isEmpty()) {
            showManualServerDialog();
            return;
        }

        pairingProgress.setVisibility(View.VISIBLE);
        pairingCodeDisplay.setText("…");
        pairingCountdown.setText("Requesting Device Code from server…");

        pairingManager.requestCode(serverUrl, "Android TV", new PairingManager.RequestCodeCallback() {
            @Override
            public void onSuccess(final String deviceCode, int expiresInSeconds, String serverName) {
                preferences.setDeviceCode(deviceCode);
                pairingCodeDisplay.setText(deviceCode);
                pairingCountdown.setText("Waiting for connection… (Code expires in 15 mins)");
                pairingProgress.setVisibility(View.VISIBLE);
                btnRefreshCode.requestFocus();

                // Start polling until user approves on phone/browser
                startPolling(deviceCode);
            }

            @Override
            public void onError(String message) {
                pairingProgress.setVisibility(View.GONE);
                pairingCountdown.setText(message);
                btnRefreshCode.requestFocus();
            }
        });
    }

    private void startPolling(final String deviceCode) {
        final String serverUrl = preferences.getServerUrl();
        pairingManager.startPolling(serverUrl, deviceCode, new PairingManager.PairingCallback() {
            @Override
            public void onPaired(String shareToken, String targetType, String dashboardId, int rotationInterval, String deviceName) {
                preferences.setShareToken(shareToken);
                preferences.setTargetType(targetType);
                preferences.setDashboardId(dashboardId);
                preferences.setRotationInterval(rotationInterval);

                Toast.makeText(MainActivity.this, "TV Connected Successfully!", Toast.LENGTH_SHORT).show();
                showDashboard();
            }

            @Override
            public void onPending(int remainingSeconds) {
                int mins = remainingSeconds / 60;
                int secs = remainingSeconds % 60;
                pairingCountdown.setText(String.format(Locale.getDefault(), "Waiting for connection… (%02d:%02d remaining)", mins, secs));
            }

            @Override
            public void onExpired() {
                pairingProgress.setVisibility(View.GONE);
                pairingCountdown.setText("Pairing code expired. Click below to refresh.");
                btnRefreshCode.requestFocus();
            }

            @Override
            public void onError(String message) {
                pairingCountdown.setText("Pairing check: " + message);
            }
        });
    }

    private void showDashboard() {
        pairingManager.stopPolling();
        pairingContainer.setVisibility(View.GONE);
        dashboardContainer.setVisibility(View.VISIBLE);

        String serverUrl = preferences.getServerUrl();
        String shareToken = preferences.getShareToken();
        String targetUrl = serverUrl + "/shared/" + shareToken;

        dashboardWebView.loadUrl(targetUrl);
        dashboardWebView.requestFocus();

        burnInProtector.start();
        startPeriodicPing();
    }

    private void showPairingScreen() {
        burnInProtector.stop();
        stopPeriodicPing();
        dashboardContainer.setVisibility(View.GONE);
        pairingContainer.setVisibility(View.VISIBLE);
        btnRefreshCode.requestFocus();
    }

    private void startPeriodicPing() {
        stopPeriodicPing();
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (preferences.isPaired()) {
                    pairingManager.ping(preferences.getServerUrl(), preferences.getDeviceCode(), new PairingManager.PingCallback() {
                        @Override
                        public void onStatusResult(String status, String shareToken, String targetType, String dashboardId, int rotationInterval) {
                            if ("not_found".equalsIgnoreCase(status) || "revoked".equalsIgnoreCase(status)) {
                                preferences.clearPairing();
                                showPairingScreen();
                                requestNewPairingCode();
                                return;
                            }
                            if ("paired".equalsIgnoreCase(status) && shareToken != null && !shareToken.isEmpty()) {
                                boolean changed = !shareToken.equals(preferences.getShareToken())
                                        || !targetType.equals(preferences.getTargetType())
                                        || !dashboardId.equals(preferences.getDashboardId());
                                if (changed) {
                                    preferences.setShareToken(shareToken);
                                    preferences.setTargetType(targetType);
                                    preferences.setDashboardId(dashboardId);
                                    preferences.setRotationInterval(rotationInterval);
                                    showDashboard();
                                }
                            }
                        }
                    });
                    mainHandler.postDelayed(this, 30_000L); // Ping every 30s
                }
            }
        };
        mainHandler.postDelayed(pingRunnable, 30_000L);
    }

    private void stopPeriodicPing() {
        if (pingRunnable != null) {
            mainHandler.removeCallbacks(pingRunnable);
            pingRunnable = null;
        }
    }

    private void showManualServerDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configure Family App Server URL");

        final EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setText(preferences.getServerUrl().isEmpty() ? "http://192.168.1." : preferences.getServerUrl());
        builder.setView(input);

        builder.setPositiveButton("Save & Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String entered = input.getText().toString().trim().replaceAll("/+$", "");
                if (!entered.isEmpty()) {
                    if (!entered.startsWith("http://") && !entered.startsWith("https://")) {
                        entered = "http://" + entered;
                    }
                    preferences.setServerUrl(entered);
                    requestNewPairingCode();
                }
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    // TV Remote D-Pad Navigation & Shortcuts
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_MENU) {
            if (dashboardContainer.getVisibility() == View.VISIBLE) {
                openQuickMenu();
                return true;
            }
        } else if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            if (dashboardContainer.getVisibility() == View.VISIBLE) {
                onToggleRotation();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    private void openQuickMenu() {
        OverlayMenuDialog dialog = new OverlayMenuDialog(this, preferences.isRotationPaused(), this);
        dialog.show();
    }

    // Menu Actions
    @Override
    public void onRefreshDashboard() {
        if (dashboardWebView != null) {
            dashboardWebView.reload();
            Toast.makeText(this, "Refreshing Dashboard…", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onToggleRotation() {
        boolean nowPaused = !preferences.isRotationPaused();
        preferences.setRotationPaused(nowPaused);
        String js = nowPaused
                ? "if (window.pauseRotation) { window.pauseRotation(); } else { console.log('Paused'); }"
                : "if (window.resumeRotation) { window.resumeRotation(); } else { console.log('Resumed'); }";
        dashboardWebView.evaluateJavascript(js, null);
        Toast.makeText(this, nowPaused ? "Rotation Paused" : "Rotation Resumed", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onToggleScreensaver() {
        // Launch Screensaver DreamService preview
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.setClassName("com.android.systemui", "com.android.systemui.Somnambulator");
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Set as screensaver in Android TV Settings -> Device Preferences -> Screen saver", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onUnpairDevice() {
        new AlertDialog.Builder(this)
                .setTitle("Unpair TV")
                .setMessage("Are you sure you want to disconnect this TV from the dashboard?")
                .setPositiveButton("Unpair", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        preferences.clearPairing();
                        showPairingScreen();
                        requestNewPairingCode();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (preferences.isPaired()) {
            burnInProtector.start();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        burnInProtector.stop();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pairingManager.stopPolling();
        discoveryManager.stop();
        stopPeriodicPing();
        if (clockRunnable != null) {
            mainHandler.removeCallbacks(clockRunnable);
        }
    }
}
