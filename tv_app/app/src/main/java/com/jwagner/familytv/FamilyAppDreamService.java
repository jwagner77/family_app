package com.jwagner.familytv;

import android.annotation.SuppressLint;
import android.os.Handler;
import android.os.Looper;
import android.service.dreams.DreamService;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Android TV Screensaver DreamService.
 * When the Android TV is left idle, this service is automatically launched
 * by the system to present an ambient view of the Family Hub dashboard with
 * real-time clock, weather, agenda updates, and continuous OLED burn-in protection.
 */
public class FamilyAppDreamService extends DreamService {

    private TvPreferences preferences;
    private BurnInProtector burnInProtector;
    private WebView dreamWebView;
    private TextView dreamTime;
    private TextView dreamDate;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("h:mm a", Locale.getDefault());
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("EEEE, MMMM d", Locale.getDefault());

    private final Runnable clockRunnable = new Runnable() {
        @Override
        public void run() {
            Date now = new Date();
            if (dreamTime != null) dreamTime.setText(timeFormat.format(now));
            if (dreamDate != null) dreamDate.setText(dateFormat.format(now));
            mainHandler.postDelayed(this, 10_000L);
        }
    };

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();

        // Configure ambient TV screen attributes
        setInteractive(true);
        setFullscreen(true);
        setScreenBright(false); // Enable subtle ambient dimming for evening/night

        setContentView(R.layout.service_dream);

        preferences = new TvPreferences(this);

        FrameLayout burnInWrapper = findViewById(R.id.burn_in_wrapper);
        dreamWebView = findViewById(R.id.dream_webview);
        dreamTime = findViewById(R.id.dream_time);
        dreamDate = findViewById(R.id.dream_date);

        burnInProtector = new BurnInProtector(burnInWrapper);

        setupAmbientWebView();
        startAmbientClock();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupAmbientWebView() {
        if (dreamWebView == null) return;

        WebSettings webSettings = dreamWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setLoadsImagesAutomatically(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setUserAgentString(webSettings.getUserAgentString() + " FamilyHubTV-Screensaver/1.0");

        dreamWebView.setWebChromeClient(new WebChromeClient());
        dreamWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject screensaver ambient mode styles: softer card opacity, hidden scrollbars, overscan padding
                String ambientCssJs = "javascript:(function() {" +
                        "  var style = document.createElement('style');" +
                        "  style.innerHTML = '::-webkit-scrollbar { display: none !important; } body { padding: 32px 48px !important; box-sizing: border-box !important; user-select: none !important; filter: brightness(0.92); }';" +
                        "  document.head.appendChild(style);" +
                        "})()";
                view.evaluateJavascript(ambientCssJs, null);
            }
        });

        if (preferences.isPaired()) {
            String serverUrl = preferences.getServerUrl();
            String shareToken = preferences.getShareToken();
            String url = serverUrl + "/shared/" + shareToken;
            dreamWebView.loadUrl(url);
        } else {
            // Unpaired placeholder: show empty state message
            if (dreamDate != null) {
                dreamDate.setText("Launch Family Hub TV to connect to your dashboard");
            }
        }
    }

    private void startAmbientClock() {
        mainHandler.post(clockRunnable);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        if (burnInProtector != null) {
            burnInProtector.start();
        }
    }

    @Override
    public void onDreamingStopped() {
        super.onDreamingStopped();
        if (burnInProtector != null) {
            burnInProtector.stop();
        }
    }

    @Override
    public void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        mainHandler.removeCallbacks(clockRunnable);
        if (burnInProtector != null) {
            burnInProtector.stop();
        }
        if (dreamWebView != null) {
            dreamWebView.destroy();
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Any TV remote button press exits the screensaver and returns to active TV view
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            wakeUp();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
}
