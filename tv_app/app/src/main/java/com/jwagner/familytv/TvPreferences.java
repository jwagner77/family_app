package com.jwagner.familytv;

import android.content.Context;
import android.content.SharedPreferences;

public class TvPreferences {
    private static final String PREF_NAME = "family_hub_tv_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_DEVICE_CODE = "device_code";
    private static final String KEY_SHARE_TOKEN = "share_token";
    private static final String KEY_TARGET_TYPE = "target_type";
    private static final String KEY_DASHBOARD_ID = "dashboard_id";
    private static final String KEY_ROTATION_INTERVAL = "rotation_interval";
    private static final String KEY_ROTATION_PAUSED = "rotation_paused";
    private static final String KEY_AMBIENT_MODE = "ambient_mode";
    private static final String KEY_SERVER_NAME = "server_name";

    private final SharedPreferences prefs;

    public TvPreferences(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public boolean isPaired() {
        return getShareToken() != null && !getShareToken().isEmpty() && getServerUrl() != null && !getServerUrl().isEmpty();
    }

    public String getServerUrl() {
        return prefs.getString(KEY_SERVER_URL, "");
    }

    public void setServerUrl(String url) {
        prefs.edit().putString(KEY_SERVER_URL, url != null ? url.replaceAll("/+$", "") : "").apply();
    }

    public String getDeviceCode() {
        return prefs.getString(KEY_DEVICE_CODE, "");
    }

    public void setDeviceCode(String code) {
        prefs.edit().putString(KEY_DEVICE_CODE, code).apply();
    }

    public String getShareToken() {
        return prefs.getString(KEY_SHARE_TOKEN, "");
    }

    public void setShareToken(String token) {
        prefs.edit().putString(KEY_SHARE_TOKEN, token).apply();
    }

    public String getTargetType() {
        return prefs.getString(KEY_TARGET_TYPE, "single");
    }

    public void setTargetType(String type) {
        prefs.edit().putString(KEY_TARGET_TYPE, type).apply();
    }

    public String getDashboardId() {
        return prefs.getString(KEY_DASHBOARD_ID, "default");
    }

    public void setDashboardId(String id) {
        prefs.edit().putString(KEY_DASHBOARD_ID, id).apply();
    }

    public int getRotationInterval() {
        return prefs.getInt(KEY_ROTATION_INTERVAL, 30);
    }

    public void setRotationInterval(int seconds) {
        prefs.edit().putInt(KEY_ROTATION_INTERVAL, seconds).apply();
    }

    public boolean isRotationPaused() {
        return prefs.getBoolean(KEY_ROTATION_PAUSED, false);
    }

    public void setRotationPaused(boolean paused) {
        prefs.edit().putBoolean(KEY_ROTATION_PAUSED, paused).apply();
    }

    public boolean isAmbientMode() {
        return prefs.getBoolean(KEY_AMBIENT_MODE, false);
    }

    public void setAmbientMode(boolean ambient) {
        prefs.edit().putBoolean(KEY_AMBIENT_MODE, ambient).apply();
    }

    public String getServerName() {
        return prefs.getString(KEY_SERVER_NAME, "Family Hub");
    }

    public void setServerName(String name) {
        prefs.edit().putString(KEY_SERVER_NAME, name).apply();
    }

    public void clearPairing() {
        prefs.edit()
                .remove(KEY_DEVICE_CODE)
                .remove(KEY_SHARE_TOKEN)
                .remove(KEY_TARGET_TYPE)
                .remove(KEY_DASHBOARD_ID)
                .remove(KEY_ROTATION_PAUSED)
                .remove(KEY_AMBIENT_MODE)
                .apply();
    }

    public void clearAll() {
        prefs.edit().clear().apply();
    }
}
