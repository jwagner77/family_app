import React, { useState } from 'react';
import { Sliders, Maximize2, Check } from 'lucide-react';
import { SCALE_MODES } from '../utils/dashboardScale';

export default function DashboardScaleControl({ scaleMode, setScaleMode, isShared = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const activeMode = SCALE_MODES.find(m => m.id === scaleMode) || SCALE_MODES[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: isShared ? '0.85rem' : '0.8125rem',
          padding: isShared ? '0.35rem 0.65rem' : '0.5rem 0.75rem',
          whiteSpace: 'nowrap'
        }}
        title="Adjust dashboard scale and TV viewport fitting"
      >
        <Maximize2 size={13} />
        <span>{scaleMode === 'auto' ? 'Auto-Fit' : `${scaleMode}%`}</span>
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 110 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="card animate-fade-in"
            style={{
              position: 'absolute',
              right: 0,
              top: '115%',
              width: '240px',
              zIndex: 120,
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              boxShadow: 'var(--shadow-lg)',
              background: 'var(--card)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                Screen Scaling & Zoom
              </span>
            </div>

            {SCALE_MODES.map(mode => {
              const isSelected = mode.id === scaleMode;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setScaleMode(mode.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease'
                  }}
                  className={isSelected ? '' : 'btn-ghost'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontWeight: isSelected ? '700' : '600', fontSize: '0.8rem' }}>
                    <span>{mode.label}</span>
                    {isSelected && <Check size={13} />}
                  </div>
                  <span style={{ fontSize: '0.68rem', opacity: isSelected ? 0.9 : 0.65, marginTop: '0.1rem' }}>
                    {mode.description}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
