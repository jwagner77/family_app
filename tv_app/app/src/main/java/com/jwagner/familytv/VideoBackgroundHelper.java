package com.jwagner.familytv;

import android.webkit.WebView;

/**
 * Manages video background playback enhancements, hardware optimization,
 * resolution capping, and auto-recovery watchdog for Android TV displays.
 */
public class VideoBackgroundHelper {

    /**
     * Injects CSS optimizations tailored for TV chipsets.
     * When smooth mode is enabled, replaces expensive real-time backdrop-filter blurs
     * with high-performance solid/tinted surfaces to prevent GPU fillrate throttling
     * and maintain silky-smooth 60fps video playback.
     */
    public static void applyPerformanceStyles(WebView webView, boolean smoothMode) {
        if (webView == null) return;

        String css;
        if (smoothMode) {
            css = "/* TV Video Background Smooth Mode (High Performance 60FPS) */" +
                  "::-webkit-scrollbar { display: none !important; }" +
                  ".youtube-bg-active .dashboard-card, " +
                  ".youtube-bg-active [class*='glass'], " +
                  "body.has-video-bg .dashboard-card { " +
                  "  backdrop-filter: none !important; " +
                  "  -webkit-backdrop-filter: none !important; " +
                  "  background-color: rgba(15, 23, 42, 0.88) !important; " +
                  "  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important; " +
                  "}" +
                  "iframe, video { " +
                  "  transform: translate3d(-50%, -50%, 0) !important; " +
                  "  will-change: transform !important; " +
                  "  backface-visibility: hidden !important; " +
                  "}";
        } else {
            css = "::-webkit-scrollbar { display: none !important; }";
        }

        String js = "javascript:(function() {" +
                    "  var id = 'familytv-smooth-css';" +
                    "  var el = document.getElementById(id);" +
                    "  if (!el) {" +
                    "    el = document.createElement('style');" +
                    "    el.id = id;" +
                    "    document.head.appendChild(el);" +
                    "  }" +
                    "  el.innerHTML = " + escapeJsString(css) + ";" +
                    "})()";

        webView.evaluateJavascript(js, null);
    }

    /**
     * Injects a background video watchdog loop into the dashboard DOM.
     * Continuously monitors YouTube iframes and HTML5 <video> elements:
     * - Auto-recovers if playback stalls or drops into a paused state
     * - Enforces 720p/1080p playback quality to prevent 4K decoder stutter
     * - Seamlessly seeks to beginning on video end without black flashes
     * - Respects mute/unmute preferences
     */
    public static void startVideoWatchdog(WebView webView, boolean isMuted) {
        if (webView == null) return;

        String watchdogScript =
            "(function() {" +
            "  if (window.__familyTvWatchdogActive) return;" +
            "  window.__familyTvWatchdogActive = true;" +
            "  var targetMuted = " + (isMuted ? "true" : "false") + ";" +
            "" +
            "  function sendYouTubeCmd(iframe, func, args) {" +
            "    try {" +
            "      if (iframe && iframe.contentWindow) {" +
            "        iframe.contentWindow.postMessage(JSON.stringify({" +
            "          event: 'command'," +
            "          func: func," +
            "          args: args || []" +
            "        }), '*');" +
            "      }" +
            "    } catch(e) {}" +
            "  }" +
            "" +
            "  function enforceVideoHealth() {" +
            "    var iframes = document.querySelectorAll('iframe');" +
            "    for (var i = 0; i < iframes.length; i++) {" +
            "      var src = iframes[i].src || '';" +
            "      if (src.indexOf('youtube') !== -1) {" +
            "        document.body.classList.add('youtube-bg-active');" +
            "        sendYouTubeCmd(iframes[i], 'setPlaybackQualityRange', ['hd720', 'hd1080']);" +
            "        sendYouTubeCmd(iframes[i], 'setPlaybackQuality', ['hd720']);" +
            "        if (targetMuted) {" +
            "          sendYouTubeCmd(iframes[i], 'mute');" +
            "        } else {" +
            "          sendYouTubeCmd(iframes[i], 'unMute');" +
            "          sendYouTubeCmd(iframes[i], 'setVolume', [100]);" +
            "        }" +
            "        sendYouTubeCmd(iframes[i], 'playVideo');" +
            "      }" +
            "    }" +
            "    var videos = document.querySelectorAll('video');" +
            "    for (var j = 0; j < videos.length; j++) {" +
            "      var v = videos[j];" +
            "      v.muted = targetMuted;" +
            "      v.loop = true;" +
            "      v.playsInline = true;" +
            "      if (v.paused && !v.ended) {" +
            "        v.play().catch(function() {});" +
            "      }" +
            "    }" +
            "  }" +
            "" +
            "  window.addEventListener('message', function(e) {" +
            "    if (!e.origin || e.origin.indexOf('youtube') === -1) return;" +
            "    try {" +
            "      var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;" +
            "      if (!data) return;" +
            "      var state = data.event === 'onStateChange' ? data.info :" +
            "                  (data.event === 'infoDelivery' && data.info ? data.info.playerState : undefined);" +
            "      var iframe = document.querySelector('iframe[src*=\"youtube\"]');" +
            "      if (state === 0 && iframe) {" +
            "        sendYouTubeCmd(iframe, 'seekTo', [0, true]);" +
            "        sendYouTubeCmd(iframe, 'playVideo');" +
            "      } else if (state === 1 && iframe) {" +
            "        sendYouTubeCmd(iframe, 'setPlaybackQualityRange', ['hd720', 'hd1080']);" +
            "      }" +
            "    } catch(err) {}" +
            "  });" +
            "" +
            "  window.setFamilyTvVideoMute = function(mute) {" +
            "    targetMuted = mute;" +
            "    enforceVideoHealth();" +
            "  };" +
            "" +
            "  window.resyncFamilyTvVideo = function() {" +
            "    var iframes = document.querySelectorAll('iframe[src*=\"youtube\"]');" +
            "    for (var i = 0; i < iframes.length; i++) {" +
            "      sendYouTubeCmd(iframes[i], 'seekTo', [0, true]);" +
            "      sendYouTubeCmd(iframes[i], 'playVideo');" +
            "    }" +
            "    var videos = document.querySelectorAll('video');" +
            "    for (var j = 0; j < videos.length; j++) {" +
            "      videos[j].currentTime = 0;" +
            "      videos[j].play().catch(function() {});" +
            "    }" +
            "  };" +
            "" +
            "  enforceVideoHealth();" +
            "  setInterval(enforceVideoHealth, 4000);" +
            "})();";

        webView.evaluateJavascript("javascript:" + watchdogScript, null);
    }

    public static void setMuted(WebView webView, boolean muted) {
        if (webView == null) return;
        webView.evaluateJavascript("if (window.setFamilyTvVideoMute) { window.setFamilyTvVideoMute(" + muted + "); }", null);
    }

    public static void resyncVideo(WebView webView) {
        if (webView == null) return;
        webView.evaluateJavascript("if (window.resyncFamilyTvVideo) { window.resyncFamilyTvVideo(); }", null);
    }

    private static String escapeJsString(String s) {
        if (s == null) return "''";
        return "'" + s.replace("\\", "\\\\")
                      .replace("'", "\\'")
                      .replace("\n", "\\n")
                      .replace("\r", "") + "'";
    }
}
