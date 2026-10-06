import React, { useState, useEffect } from 'react';
import { 
  Cast, Tv, Copy, ExternalLink, RefreshCw, Check, 
  HelpCircle, X, ShieldAlert, Monitor, Radio, CheckCircle2 
} from 'lucide-react';
import { requestCastSession, stopCasting, getCastStatus, subscribeCastState } from '../utils/cast';

export default function CastDashboardModal({ 
  isOpen, 
  onClose, 
  dashboardTitle = 'Home Dashboard', 
  shareUrl = '', 
  showToast = () => {} 
}) {
  const [castState, setCastState] = useState(() => getCastStatus());
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeCastState((updated) => {
      setCastState(getCastStatus());
    });
    setCastState(getCastStatus());
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const effectiveUrl = shareUrl || window.location.href;

  const handleStartCast = async () => {
    setIsConnecting(true);
    try {
      const result = await requestCastSession(effectiveUrl);
      if (result.success) {
        showToast(`Casting session started${result.deviceName ? ' with ' + result.deviceName : ''}!`, 'success');
      } else if (result.fallbackRequired) {
        showToast('Tip: Use Chrome menu ⋮ -> Cast... to cast this tab directly.', 'info');
      }
    } catch (err) {
      showToast('Could not start cast session: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopCast = async () => {
    try {
      await stopCasting();
      showToast('Casting session disconnected.', 'info');
    } catch (err) {
      showToast('Error stopping cast: ' + err.message, 'error');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      showToast('Direct dashboard URL copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Failed to copy URL', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content animate-fade-in" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '540px', padding: 0, overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Cast size={20} style={{ color: 'var(--primary)' }} />
            Cast Dashboard to Screen
          </h2>
          <button 
            type="button" 
            className="close-btn" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Casting Status Banner */}
          {castState.isCasting ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e'
                }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                    Currently Casting to {castState.deviceName || 'Screen'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Dashboard: {dashboardTitle}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline danger"
                onClick={handleStopCast}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <Cast size={24} />
              </div>
              
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.2rem' }}>
                  Chromecast & Smart Displays
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', maxWidth: '380px' }}>
                  Cast this live dashboard wirelessly to any Google Nest Hub, Chromecast with Google TV, or smart display on your network.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartCast}
                disabled={isConnecting}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Cast size={16} />
                    <span>Cast to Chromecast / TV</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Direct Smart TV / Kiosk Display URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Monitor size={14} style={{ color: 'var(--primary)' }} />
              Direct Screen / TV Browser Link
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={effectiveUrl}
                className="input-control"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  background: 'var(--card)',
                  color: 'var(--foreground)'
                }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCopyUrl}
                style={{ padding: '0 0.85rem', height: '2.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                title="Copy direct screen link"
              >
                {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.open(effectiveUrl, '_blank')}
                style={{ padding: '0 0.85rem', height: '2.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                title="Open in fullscreen new tab"
              >
                <ExternalLink size={14} />
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
              Works on Samsung Tizen, LG webOS, Fire TV Silk, Google Nest Hub, Android TVs, and wall tablets.
            </span>
          </div>

          {/* Chrome Casting Tip */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '0.85rem 1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <HelpCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--foreground)' }}>Pro Tip for Chrome / Edge:</strong> You can also click the browser menu <strong>⋮</strong> in the top right corner and choose <strong>Cast...</strong> to mirror any tab or window directly to your screen with full audio support.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
