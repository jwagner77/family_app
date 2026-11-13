package com.jwagner.familytv;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.Button;

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
    }

    private final MenuActionListener listener;
    private final boolean isRotationPaused;

    public OverlayMenuDialog(@NonNull Context context, boolean isRotationPaused, MenuActionListener listener) {
        super(context);
        this.listener = listener;
        this.isRotationPaused = isRotationPaused;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.dialog_quick_menu);

        if (getWindow() != null) {
            getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        Button btnRefresh = findViewById(R.id.menu_btn_refresh);
        Button btnToggleRotation = findViewById(R.id.menu_btn_toggle_rotation);
        Button btnScreensaver = findViewById(R.id.menu_btn_screensaver);
        Button btnUnpair = findViewById(R.id.menu_btn_unpair);
        Button btnClose = findViewById(R.id.menu_btn_close);

        btnToggleRotation.setText(isRotationPaused ? "▶️ Resume Rotation" : "⏸️ Pause Rotation");

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

        // Set initial focus for D-Pad
        btnRefresh.requestFocus();
    }
}
