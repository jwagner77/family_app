package com.jwagner.familytv;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;

/**
 * TV Quick Actions HUD Dialog navigable with Android TV D-Pad.
 */
public class OverlayMenuDialog extends Dialog {

    public interface MenuActionListener {
        void onRefreshDashboard();
        void onToggleRotation();
        void onToggleScreensaver();
        void onUnpairDevice();
        void onZoomIn();
        void onZoomOut();
        void onZoomReset();
        void onToggleVideoSmoothMode();
        void onToggleVideoAudio();
        void onResyncVideo();
    }

    private final MenuActionListener listener;
    private final TvPreferences preferences;
    private TextView tvZoomDisplay;
    private Button btnVideoSmoothMode;
    private Button btnVideoAudio;

    public OverlayMenuDialog(@NonNull Context context, TvPreferences preferences, MenuActionListener listener) {
        super(context);
        this.preferences = preferences;
        this.listener = listener;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.dialog_quick_menu);

        if (getWindow() != null) {
            getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        // Zoom Controls
        Button btnZoomOut = findViewById(R.id.menu_btn_zoom_out);
        Button btnZoomIn = findViewById(R.id.menu_btn_zoom_in);
        Button btnZoomReset = findViewById(R.id.menu_btn_zoom_reset);
        tvZoomDisplay = findViewById(R.id.menu_tv_zoom_display);

        updateZoomText();

        btnZoomOut.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onZoomOut();
                updateZoomText();
            }
        });

        btnZoomIn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onZoomIn();
                updateZoomText();
            }
        });

        btnZoomReset.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onZoomReset();
                updateZoomText();
            }
        });

        // Video Background Controls
        btnVideoSmoothMode = findViewById(R.id.menu_btn_video_smooth_mode);
        btnVideoAudio = findViewById(R.id.menu_btn_video_audio);
        Button btnVideoResync = findViewById(R.id.menu_btn_video_resync);

        updateVideoButtons();

        btnVideoSmoothMode.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onToggleVideoSmoothMode();
                updateVideoButtons();
            }
        });

        btnVideoAudio.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onToggleVideoAudio();
                updateVideoButtons();
            }
        });

        btnVideoResync.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (listener != null) listener.onResyncVideo();
            }
        });

        // Dashboard Navigation Controls
        Button btnRefresh = findViewById(R.id.menu_btn_refresh);
        Button btnToggleRotation = findViewById(R.id.menu_btn_toggle_rotation);
        Button btnScreensaver = findViewById(R.id.menu_btn_screensaver);
        Button btnUnpair = findViewById(R.id.menu_btn_unpair);
        Button btnClose = findViewById(R.id.menu_btn_close);

        btnToggleRotation.setText(preferences.isRotationPaused() ? "▶️ Resume Rotation" : "⏸️ Pause Rotation");

        btnRefresh.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
                if (listener != null) listener.onRefreshDashboard();
            }
        });

        btnToggleRotation.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
                if (listener != null) listener.onToggleRotation();
            }
        });

        btnScreensaver.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
                if (listener != null) listener.onToggleScreensaver();
            }
        });

        btnUnpair.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
                if (listener != null) listener.onUnpairDevice();
            }
        });

        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
            }
        });

        // Focus first control for D-pad navigation
        btnRefresh.requestFocus();
    }

    private void updateZoomText() {
        if (tvZoomDisplay != null) {
            tvZoomDisplay.setText(preferences.getZoomLevel() + "%");
        }
    }

    private void updateVideoButtons() {
        if (btnVideoSmoothMode != null) {
            boolean smooth = preferences.isVideoSmoothMode();
            btnVideoSmoothMode.setText(smooth ? "⚡ Smooth Video Mode (60FPS): ON" : "✨ Smooth Video Mode: OFF");
        }
        if (btnVideoAudio != null) {
            boolean muted = preferences.isVideoMuted();
            btnVideoAudio.setText(muted ? "🔇 Video Audio: Muted" : "🔊 Video Audio: Unmuted");
        }
    }
}
