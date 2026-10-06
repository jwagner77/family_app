// Chromecast & Presentation API utility for Dashboard Casting

let castInitialized = false;
let currentPresentationConnection = null;
const listeners = new Set();

export function subscribeCastState(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(state) {
  listeners.forEach(cb => {
    try {
      cb(state);
    } catch (e) {
      console.error('Error in cast listener:', e);
    }
  });
}

// Get current active Cast state
export function getCastStatus() {
  const isCastFrameworkAvailable = typeof window !== 'undefined' && Boolean(window.cast && window.cast.framework);
  const isPresentationAvailable = typeof window !== 'undefined' && Boolean(window.PresentationRequest);
  
  let isCasting = false;
  let deviceName = '';

  if (isCastFrameworkAvailable) {
    try {
      const castContext = window.cast.framework.CastContext.getInstance();
      const session = castContext.getCurrentSession();
      if (session) {
        isCasting = true;
        deviceName = session.getCastDevice()?.friendlyName || 'Chromecast';
      }
    } catch (e) {}
  }

  if (!isCasting && currentPresentationConnection && currentPresentationConnection.state === 'connected') {
    isCasting = true;
    deviceName = 'Connected Display';
  }

  return {
    isAvailable: isCastFrameworkAvailable || isPresentationAvailable,
    isCasting,
    deviceName,
    hasCastFramework: isCastFrameworkAvailable,
    hasPresentationApi: isPresentationAvailable
  };
}

// Setup Google Cast SDK options
export function initCastSdk() {
  if (typeof window === 'undefined') return;

  window.__onGCastApiAvailable = function (isAvailable) {
    if (isAvailable && window.cast && window.cast.framework) {
      try {
        const castContext = window.cast.framework.CastContext.getInstance();
        castContext.setOptions({
          receiverApplicationId: window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
          autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped'
        });

        castContext.addEventListener(
          window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          (event) => {
            const session = castContext.getCurrentSession();
            const isConnected = event.sessionState === window.cast.framework.SessionState.SESSION_STARTED ||
                                event.sessionState === window.cast.framework.SessionState.SESSION_RESUMED;
            notifyListeners({
              isCasting: isConnected,
              deviceName: session?.getCastDevice()?.friendlyName || 'Chromecast',
              sessionState: event.sessionState
            });
          }
        );

        castInitialized = true;
      } catch (err) {
        console.warn('Google Cast SDK initialization notice:', err);
      }
    }
  };

  // If already available immediately
  if (window.cast && window.cast.framework && !castInitialized) {
    window.__onGCastApiAvailable(true);
  }
}

// Request Cast session (triggers native Chrome/Chromecast device picker or Presentation API)
export async function requestCastSession(url) {
  const targetUrl = url || window.location.href;

  // 1. Try Presentation API (Standard Chromecast / Smart Display mirroring protocol in Chrome)
  if (typeof window !== 'undefined' && window.PresentationRequest) {
    try {
      const presentationRequest = new PresentationRequest([targetUrl]);
      
      if (presentationRequest.getAvailability) {
        presentationRequest.getAvailability().catch(() => {});
      }

      const connection = await presentationRequest.start();
      currentPresentationConnection = connection;

      connection.addEventListener('connect', () => {
        notifyListeners({ isCasting: true, deviceName: 'Connected Display', type: 'presentation' });
      });

      connection.addEventListener('terminate', () => {
        currentPresentationConnection = null;
        notifyListeners({ isCasting: false, deviceName: '', type: 'presentation' });
      });

      connection.addEventListener('close', () => {
        currentPresentationConnection = null;
        notifyListeners({ isCasting: false, deviceName: '', type: 'presentation' });
      });

      notifyListeners({ isCasting: true, deviceName: 'Connected Display', type: 'presentation' });
      return { success: true, type: 'presentation', connection };
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
        // User cancelled the Cast dialog
        return { success: false, cancelled: true };
      }
      console.warn('PresentationRequest attempted, falling back to Cast SDK:', err);
    }
  }

  // 2. Try Google Cast Sender SDK directly
  if (typeof window !== 'undefined' && window.cast && window.cast.framework) {
    try {
      const castContext = window.cast.framework.CastContext.getInstance();
      await castContext.requestSession();
      const session = castContext.getCurrentSession();
      const deviceName = session?.getCastDevice()?.friendlyName || 'Chromecast';
      notifyListeners({ isCasting: true, deviceName, type: 'cast_sdk' });
      return { success: true, type: 'cast_sdk', session, deviceName };
    } catch (err) {
      if (err === 'cancel' || err?.message === 'cancel') {
        return { success: false, cancelled: true };
      }
      console.warn('CastContext requestSession error:', err);
      throw err;
    }
  }

  // 3. Fallback when browser doesn't expose native picker via API
  return { success: false, fallbackRequired: true };
}

// Stop current active Cast session
export async function stopCasting() {
  if (currentPresentationConnection) {
    try {
      currentPresentationConnection.terminate();
    } catch (e) {}
    currentPresentationConnection = null;
  }

  if (typeof window !== 'undefined' && window.cast && window.cast.framework) {
    try {
      const castContext = window.cast.framework.CastContext.getInstance();
      await castContext.endCurrentSession(true);
    } catch (e) {}
  }

  notifyListeners({ isCasting: false, deviceName: '' });
}
