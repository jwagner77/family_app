import { useState, useEffect, useCallback, useMemo } from 'react';

export const SCALE_MODES = [
  { id: 'auto', label: 'Auto-Fit (No Scroll)', description: 'Dynamically fits dashboard to screen height' },
  { id: '85', label: '85% (Compact)', description: '75px row height, compact spacing' },
  { id: '100', label: '100% (Standard)', description: '95px row height, standard spacing' },
  { id: '115', label: '115% (Large)', description: '110px row height, larger fonts' },
  { id: '130', label: '130% (X-Large / 4K)', description: '130px row height, for 4K & large TVs' }
];

export function useDashboardScale({ widgets = [], isShared = false, headerRef = null }) {
  const storageKey = isShared ? 'shared_dashboard_scale_mode' : 'custom_dashboard_scale_mode';
  
  // Default to 'auto' for shared/TV dashboards, and 'auto' or saved for custom dashboards
  const [scaleMode, setScaleModeState] = useState(() => {
    return localStorage.getItem(storageKey) || (isShared ? 'auto' : 'auto');
  });

  const setScaleMode = useCallback((mode) => {
    setScaleModeState(mode);
    try {
      localStorage.setItem(storageKey, mode);
    } catch (e) {}
  }, [storageKey]);

  // Compute maximum row span currently used by widgets
  const maxRows = useMemo(() => {
    if (!widgets || widgets.length === 0) return 6;
    const max = Math.max(...widgets.map(w => (Number(w.y) || 0) + (Number(w.h) || 1)));
    return Math.max(max, 4);
  }, [widgets]);

  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Compute style variables for the grid
  const scaleStyles = useMemo(() => {
    const vh = dimensions.height;
    const vw = dimensions.width;

    if (scaleMode === '85') {
      return {
        '--dashboard-row-height': '75px',
        '--dashboard-grid-gap': '0.75rem',
        '--dashboard-font-scale': '0.9',
        '--dashboard-padding': '1rem'
      };
    }

    if (scaleMode === '100') {
      return {
        '--dashboard-row-height': '95px',
        '--dashboard-grid-gap': '1.25rem',
        '--dashboard-font-scale': '1.0',
        '--dashboard-padding': isShared ? '2rem' : '1.5rem'
      };
    }

    if (scaleMode === '115') {
      return {
        '--dashboard-row-height': '112px',
        '--dashboard-grid-gap': '1.25rem',
        '--dashboard-font-scale': '1.1',
        '--dashboard-padding': isShared ? '2rem' : '1.5rem'
      };
    }

    if (scaleMode === '130') {
      return {
        '--dashboard-row-height': '130px',
        '--dashboard-grid-gap': '1.5rem',
        '--dashboard-font-scale': '1.2',
        '--dashboard-padding': '2.5rem'
      };
    }

    // --- AUTO-FIT MODE ---
    // Measure available height for the grid:
    // Dynamically measure actual header height if headerRef provided, plus safe margins
    const headerH = (headerRef && headerRef.current) ? headerRef.current.offsetHeight : (isShared ? 80 : 95);
    const paddingTotal = vh < 750 ? 24 : (vh < 950 ? 36 : 48);
    const bottomClearance = 20; // Safe area clearance for TV bezel
    const availableHeight = Math.max(250, vh - headerH - paddingTotal - bottomClearance);

    // Determine ideal gap based on viewport height and width
    const gapPx = vh < 700 ? 8 : (vh < 950 ? 12 : 16);
    const gapRem = `${gapPx / 16}rem`;

    // Calculate row height so that all rows fit in availableHeight
    const totalGaps = (maxRows - 1) * gapPx;
    const calculatedRowH = Math.floor((availableHeight - totalGaps) / maxRows);

    // Clamp between 44px (compact TV / tablets) and 130px (large 4K TVs)
    const clampedRowH = Math.max(44, Math.min(130, calculatedRowH));

    // Calculate font scale proportional to row height
    let fontScale = 1.0;
    if (clampedRowH < 58) fontScale = 0.78;
    else if (clampedRowH < 72) fontScale = 0.86;
    else if (clampedRowH < 90) fontScale = 0.94;
    else if (clampedRowH < 110) fontScale = 1.0;
    else fontScale = 1.12;

    const containerPadding = vh < 700 ? '0.5rem 1rem' : (vh < 950 ? '0.85rem 1.5rem' : '1.25rem 2rem');

    return {
      '--dashboard-row-height': `${clampedRowH}px`,
      '--dashboard-grid-gap': gapRem,
      '--dashboard-font-scale': fontScale.toString(),
      '--dashboard-padding': containerPadding,
      rowHeightNum: clampedRowH,
      gapNum: gapPx
    };
  }, [scaleMode, dimensions.height, dimensions.width, maxRows, isShared]);

  return {
    scaleMode,
    setScaleMode,
    scaleStyles,
    maxRows
  };
}
