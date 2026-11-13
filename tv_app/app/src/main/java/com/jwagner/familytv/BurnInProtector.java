package com.jwagner.familytv;

import android.os.Handler;
import android.os.Looper;
import android.view.View;

/**
 * Burn-In Protection for OLED, Mini-LED, and Plasma TVs.
 * Gently shifts the container view by 2-4 pixels in an orbital pattern
 * every 60 seconds so static UI elements never burn into display panels.
 */
public class BurnInProtector {
    private static final long SHIFT_INTERVAL_MS = 60_000L; // 60 seconds
    private static final float ORBIT_RADIUS_PX = 4.0f; // 4 pixels

    private final View targetView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean isRunning = false;
    private int step = 0;

    private final Runnable shiftRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isRunning || targetView == null) return;

            // 12-point orbital circle
            double angle = (step % 12) * (2 * Math.PI / 12.0);
            float dx = (float) (Math.cos(angle) * ORBIT_RADIUS_PX);
            float dy = (float) (Math.sin(angle) * ORBIT_RADIUS_PX);

            targetView.animate()
                    .translationX(dx)
                    .translationY(dy)
                    .setDuration(2500)
                    .start();

            step++;
            handler.postDelayed(this, SHIFT_INTERVAL_MS);
        }
    };

    public BurnInProtector(View targetView) {
        this.targetView = targetView;
    }

    public void start() {
        if (isRunning) return;
        isRunning = true;
        step = 0;
        handler.postDelayed(shiftRunnable, SHIFT_INTERVAL_MS);
    }

    public void stop() {
        isRunning = false;
        handler.removeCallbacks(shiftRunnable);
        if (targetView != null) {
            targetView.animate().translationX(0f).translationY(0f).setDuration(500).start();
        }
    }
}
