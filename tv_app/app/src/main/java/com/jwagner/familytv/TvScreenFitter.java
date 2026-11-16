package com.jwagner.familytv;

import android.webkit.WebView;

/**
 * Dynamically fits the shared dashboard to 100% of the TV screen viewport,
 * eliminating vertical overflow and cutoff on any resolution (720p, 1080p, 4K).
 *
 * Responsibilities:
 * 1. Inject TV overscan safe CSS (html, body 0-margin/padding, 100vh flex column container).
 * 2. Hide redundant desktop web buttons in header (Auto-Fit, Cast, Refresh, Back to App).
 * 3. Dynamically set grid-template-rows: repeat(maxRows, minmax(0, 1fr)) so CSS Grid mathematically
 *    fills 100% of the available vertical space with zero overflow and zero scroll.
 * 4. Scale widget typography proportionally for optimal 10-foot legibility.
 * 5. Set up MutationObserver to auto-recalculate whenever the dashboard rotates or re-renders.
 */
public class TvScreenFitter {

    public static void applyAutoFit(WebView webView, int userZoomPercent) {
        if (webView == null) return;

        double userZoomFactor = (userZoomPercent > 0 ? userZoomPercent : 100) / 100.0;

        String js = "javascript:(function() {" +
                "  var styleId = 'family-hub-tv-fit-style';" +
                "  var existingStyle = document.getElementById(styleId);" +
                "  if (!existingStyle) {" +
                "    existingStyle = document.createElement('style');" +
                "    existingStyle.id = styleId;" +
                "    document.head.appendChild(existingStyle);" +
                "  }" +
                "  existingStyle.innerHTML = '" +
                "    ::-webkit-scrollbar { display: none !important; } " +
                "    html, body { " +
                "      margin: 0 !important; " +
                "      padding: 0 !important; " +
                "      width: 100vw !important; " +
                "      height: 100vh !important; " +
                "      overflow: hidden !important; " +
                "      box-sizing: border-box !important; " +
                "      user-select: none !important; " +
                "    } " +
                "    .shared-dashboard-container { " +
                "      width: 100vw !important; " +
                "      height: 100vh !important; " +
                "      max-height: 100vh !important; " +
                "      box-sizing: border-box !important; " +
                "      overflow: hidden !important; " +
                "      display: flex !important; " +
                "      flex-direction: column !important; " +
                "      padding: 12px 28px 14px 28px !important; " +
                "    } " +
                "    .shared-dashboard-container > div:first-of-type { " +
                "      margin-bottom: 8px !important; " +
                "      flex-shrink: 0 !important; " +
                "      flex-wrap: nowrap !important; " +
                "      gap: 0.5rem !important; " +
                "    } " +
                "    .dashboard-grid { " +
                "      flex: 1 1 0% !important; " +
                "      width: 100% !important; " +
                "      height: 100% !important; " +
                "      min-height: 0 !important; " +
                "      display: grid !important; " +
                "      grid-template-columns: repeat(12, 1fr) !important; " +
                "      box-sizing: border-box !important; " +
                "      transform: none !important; " +
                "      margin: 0 !important; " +
                "    } " +
                "    .widget-card { " +
                "      min-height: 0 !important; " +
                "      overflow: hidden !important; " +
                "      display: flex !important; " +
                "      flex-direction: column !important; " +
                "    } " +
                "    .widget-card .widget-body { " +
                "      flex: 1 1 0% !important; " +
                "      min-height: 0 !important; " +
                "      overflow-y: auto !important; " +
                "    } " +
                "  ';" +
                "  function fitDashboard() {" +
                "    var container = document.querySelector('.shared-dashboard-container') || document.body;" +
                "    var grid = document.querySelector('.dashboard-grid');" +
                "    if (!container || !grid) return;" +
                "    var buttons = container.querySelectorAll('button');" +
                "    for (var b = 0; b < buttons.length; b++) {" +
                "      var txt = (buttons[b].textContent || '').trim();" +
                "      var title = (buttons[b].getAttribute('title') || '').toLowerCase();" +
                "      if (txt.indexOf('Back to App') !== -1 || txt.indexOf('Auto-Fit') !== -1 || txt.indexOf('Cast') !== -1 || txt.indexOf('Refresh Data') !== -1 || title.indexOf('scale') !== -1 || title.indexOf('cast') !== -1) {" +
                "        buttons[b].style.display = 'none';" +
                "      }" +
                "    }" +
                "    var maxRow = 4;" +
                "    var widgets = grid.children;" +
                "    for (var i = 0; i < widgets.length; i++) {" +
                "      var el = widgets[i];" +
                "      var styleGridRow = el.style.gridRow || '';" +
                "      var match = styleGridRow.match(/(\\d+)\\s*\\/\\s*span\\s*(\\d+)/);" +
                "      if (match) {" +
                "        var rowEnd = parseInt(match[1], 10) - 1 + parseInt(match[2], 10);" +
                "        if (rowEnd > maxRow) maxRow = rowEnd;" +
                "      }" +
                "    }" +
                "    var vh = window.innerHeight;" +
                "    var gapPx = vh <= 720 ? 8 : 12;" +
                "    grid.style.setProperty('grid-template-rows', 'repeat(' + maxRow + ', minmax(0, 1fr))', 'important');" +
                "    grid.style.setProperty('gap', gapPx + 'px', 'important');" +
                "    grid.style.removeProperty('--dashboard-row-height');" +
                "    grid.style.removeProperty('grid-auto-rows');" +
                "    var fontScale = vh <= 720 ? '0.86' : '1.0';" +
                "    grid.style.setProperty('--dashboard-font-scale', fontScale, 'important');" +
                "    var userZoom = " + userZoomFactor + ";" +
                "    if (userZoom !== 1.0) {" +
                "      container.style.zoom = userZoom;" +
                "    } else {" +
                "      container.style.zoom = '1.0';" +
                "    }" +
                "  }" +
                "  fitDashboard();" +
                "  window.addEventListener('resize', fitDashboard);" +
                "  setTimeout(fitDashboard, 300);" +
                "  setTimeout(fitDashboard, 1000);" +
                "  setTimeout(fitDashboard, 2000);" +
                "  if (window._familyFitObserver) window._familyFitObserver.disconnect();" +
                "  window._familyFitObserver = new MutationObserver(function() { fitDashboard(); });" +
                "  window._familyFitObserver.observe(document.body, { childList: true, subtree: true });" +
                "  window.fitDashboardToScreen = fitDashboard;" +
                "})()";

        webView.evaluateJavascript(js, null);
    }
}
