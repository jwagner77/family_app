import React, { useEffect, useMemo } from 'react';

export default function YouTubeBackground({ videoId, iframeRef, isMuted = true }) {
  const embedSrc = useMemo(() => {
    if (!videoId) return '';
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1&playsinline=1&enablejsapi=1&origin=${origin}`;
  }, [videoId]);

  const sendPlayerCommand = (func, args = []) => {
    const win = iframeRef?.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args
        }),
        '*'
      );
    } catch (e) {}
  };

  const handleIframeLoad = () => {
    const win = iframeRef?.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      // Cap background stream resolution to 720p/1080p to prevent 4K60 decoding stutter on TVs
      sendPlayerCommand('setPlaybackQualityRange', ['hd720', 'hd1080']);
      sendPlayerCommand('setPlaybackQuality', ['hd720']);
      if (isMuted) {
        sendPlayerCommand('mute');
      } else {
        sendPlayerCommand('unMute');
        sendPlayerCommand('setVolume', [100]);
      }
      sendPlayerCommand('playVideo');
    } catch (e) {}
  };

  useEffect(() => {
    // Mark body so CSS can disable expensive per-frame backdrop-filter blurs over live video
    document.body.classList.add('youtube-bg-active');

    // Auto-hide idle mouse cursor on TV / kiosk screens after 3 seconds of inactivity
    let idleTimer = null;
    const resetIdleCursor = () => {
      document.body.classList.remove('dashboard-cursor-idle');
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        document.body.classList.add('dashboard-cursor-idle');
      }, 3000);
    };
    resetIdleCursor();

    window.addEventListener('mousemove', resetIdleCursor, { passive: true });
    window.addEventListener('mousedown', resetIdleCursor, { passive: true });
    window.addEventListener('keydown', resetIdleCursor, { passive: true });

    // Prevent TV browsers from auto-fullscreening the background YouTube iframe
    const handleFullscreenChange = () => {
      if (
        document.fullscreenElement &&
        iframeRef?.current &&
        document.fullscreenElement === iframeRef.current
      ) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Listen for YouTube player state events to loop seamlessly and enforce 720p/1080p quality
    const handleMessage = (event) => {
      if (!event.origin || !event.origin.includes('youtube')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;
        const playerState =
          data.event === 'onStateChange'
            ? data.info
            : data.event === 'infoDelivery' && data.info
              ? data.info.playerState
              : undefined;

        if (playerState === 0) {
          // Video ended: seek back to 0 immediately to avoid playlist reload & title bar flash
          sendPlayerCommand('seekTo', [0, true]);
          sendPlayerCommand('playVideo');
        } else if (playerState === 1) {
          // Playing: reinforce quality cap for smooth TV playback
          sendPlayerCommand('setPlaybackQualityRange', ['hd720', 'hd1080']);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);

    return () => {
      document.body.classList.remove('youtube-bg-active');
      document.body.classList.remove('dashboard-cursor-idle');
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleCursor);
      window.removeEventListener('mousedown', resetIdleCursor);
      window.removeEventListener('keydown', resetIdleCursor);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('message', handleMessage);
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        contain: 'strict',
        backgroundColor: '#000',
        transform: 'translateZ(0)'
      }}
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        tabIndex={-1}
        aria-hidden="true"
        allow="autoplay; encrypted-media; fullscreen 'none'"
        onLoad={handleIframeLoad}
        onFocus={(e) => e.target.blur()}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          /* Overscale vertically and horizontally so YouTube's top title bar and bottom chrome are cropped outside the viewport */
          width: 'calc(100vw + 320px)',
          height: 'calc(56.25vw + 260px)',
          minHeight: 'calc(100vh + 260px)',
          minWidth: 'calc(177.78vh + 462px)',
          transform: 'translate3d(-50%, -50%, 0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          border: 'none',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
