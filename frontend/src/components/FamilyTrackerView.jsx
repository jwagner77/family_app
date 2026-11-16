import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  RefreshCw,
  Users,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  ShieldCheck,
  Smartphone,
  Layers,
  LocateFixed
} from 'lucide-react';

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

const TILE_PROVIDERS = {
  voyager: {
    name: 'Street (Voyager)',
    url: (z, x, y) => `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  osm: {
    name: 'OpenStreetMap',
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution: '© OpenStreetMap contributors'
  },
  dark: {
    name: 'Dark Matter',
    url: (z, x, y) => `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
    attribution: '© OpenStreetMap contributors, © CARTO'
  }
};

function lonToWorldX(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat, zoom) {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clampedLat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    TILE_SIZE *
    Math.pow(2, zoom)
  );
}

function worldXToLon(x, zoom) {
  return (x / (TILE_SIZE * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRelativeTime(isoStr) {
  if (!isoStr) return 'Never';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return String(isoStr);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatExactTime(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getInitials(name) {
  const parts = String(name || 'U').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return String(name || 'U').slice(0, 2).toUpperCase();
}

function UserAvatarBadge({ user, size = 40, borderColor = '#ffffff', borderWidth = 3, showShadow = true }) {
  const [imgError, setImgError] = useState(false);
  const displayName = user.display_name || user.username || 'User';
  const bg = user.primary_color || '#3b82f6';
  const hasPhoto = Boolean(user.picture_url && !imgError);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `${borderWidth}px solid ${borderColor}`,
        background: hasPhoto ? '#1e293b' : bg,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${Math.max(11, Math.round(size * 0.38))}px`,
        boxShadow: showShadow ? '0 6px 16px rgba(0, 0, 0, 0.35)' : 'none',
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {hasPhoto ? (
        <img
          src={user.picture_url}
          alt={displayName}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span>{getInitials(displayName)}</span>
      )}
    </div>
  );
}

export default function FamilyTrackerView({ showToast, currentUser, resolvedTheme }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [hoveredClusterId, setHoveredClusterId] = useState(null);
  const [mapStyle, setMapStyle] = useState(() => (resolvedTheme === 'dark' ? 'dark' : 'voyager'));

  // Map viewport state (default centered on continental US until locations load)
  const [center, setCenter] = useState({ lat: 39.8283, lon: -98.5795 });
  const [zoom, setZoom] = useState(4);
  const [mapSize, setMapSize] = useState({ width: 800, height: 540 });
  const [isDragging, setIsDragging] = useState(false);

  const mapContainerRef = useRef(null);
  const dragStartRef = useRef(null);
  const hasAutoFittedRef = useRef(false);
  const hoverTimeoutRef = useRef(null);

  const fetchLocations = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Failed to load family locations');
      const data = await res.json();
      const userList = Array.isArray(data.users) ? data.users : [];
      setUsers(userList);
    } catch (err) {
      if (!isSilent && showToast) {
        showToast(err.message || 'Could not load family locations', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLocations(false);
    const interval = setInterval(() => {
      fetchLocations(true);
    }, 15000);
    const handleRealtime = (e) => {
      const m = e.detail || {};
      if (!m.resource || m.resource === 'locations' || m.resource === 'users' || m.domain === 'people') {
        fetchLocations(true);
      }
    };
    window.addEventListener('unified-realtime-update', handleRealtime);
    return () => {
      clearInterval(interval);
      window.removeEventListener('unified-realtime-update', handleRealtime);
    };
  }, [fetchLocations]);

  // Measure map container dimensions
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMapSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    if (observer) observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const locatedUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.has_location &&
          Number.isFinite(Number(u.latitude)) &&
          Number.isFinite(Number(u.longitude))
      ),
    [users]
  );

  const connectedUsers = useMemo(
    () => users.filter((u) => Boolean(u.is_app_connected || u.has_location)),
    [users]
  );

  const fitAllUsersOnMap = useCallback(
    (targetUsers = locatedUsers) => {
      if (!targetUsers || targetUsers.length === 0) return;
      if (targetUsers.length === 1) {
        setCenter({
          lat: Number(targetUsers[0].latitude),
          lon: Number(targetUsers[0].longitude)
        });
        setZoom(15);
        return;
      }

      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLon = Infinity;
      let maxLon = -Infinity;

      for (const u of targetUsers) {
        const lat = Number(u.latitude);
        const lon = Number(u.longitude);
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }

      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;

      // Determine best zoom level that fits bounding box with padding
      const padWidth = Math.max(240, mapSize.width - 140);
      const padHeight = Math.max(240, mapSize.height - 140);
      let bestZoom = 15;
      for (let z = 16; z >= MIN_ZOOM; z--) {
        const dx = Math.abs(lonToWorldX(maxLon, z) - lonToWorldX(minLon, z));
        const dy = Math.abs(latToWorldY(minLat, z) - latToWorldY(maxLat, z));
        if (dx <= padWidth && dy <= padHeight) {
          bestZoom = z;
          break;
        }
      }

      setCenter({ lat: centerLat, lon: centerLon });
      setZoom(bestZoom);
    },
    [locatedUsers, mapSize.width, mapSize.height]
  );

  // Auto-fit once when locations first arrive
  useEffect(() => {
    if (!hasAutoFittedRef.current && locatedUsers.length > 0) {
      hasAutoFittedRef.current = true;
      fitAllUsersOnMap(locatedUsers);
    }
  }, [locatedUsers, fitAllUsersOnMap]);

  // Project located users to screen coordinates and group co-located users into clusters
  const mapClusters = useMemo(() => {
    const centerWorldX = lonToWorldX(center.lon, zoom);
    const centerWorldY = latToWorldY(center.lat, zoom);
    const worldSize = TILE_SIZE * Math.pow(2, zoom);

    const projected = locatedUsers.map((u) => {
      const lat = Number(u.latitude);
      const lon = Number(u.longitude);
      let wx = lonToWorldX(lon, zoom);
      const wy = latToWorldY(lat, zoom);

      // Handle date-line wrapping closest to center
      if (wx - centerWorldX > worldSize / 2) wx -= worldSize;
      if (centerWorldX - wx > worldSize / 2) wx += worldSize;

      const screenX = mapSize.width / 2 + (wx - centerWorldX);
      const screenY = mapSize.height / 2 + (wy - centerWorldY);

      return {
        ...u,
        lat,
        lon,
        screenX,
        screenY
      };
    });

    // Group users who are at the same physical location (<= 45m) or overlapping on screen (<= 38px)
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < projected.length; i++) {
      if (assigned.has(projected[i].user_id)) continue;
      const seed = projected[i];
      const members = [seed];
      assigned.add(seed.user_id);

      for (let j = i + 1; j < projected.length; j++) {
        const candidate = projected[j];
        if (assigned.has(candidate.user_id)) continue;

        const geoDistMeters = haversineDistanceMeters(seed.lat, seed.lon, candidate.lat, candidate.lon);
        const pixelDist = Math.hypot(seed.screenX - candidate.screenX, seed.screenY - candidate.screenY);

        if (geoDistMeters <= 45 || pixelDist <= 38) {
          members.push(candidate);
          assigned.add(candidate.user_id);
        }
      }

      const avgX = members.reduce((sum, m) => sum + m.screenX, 0) / members.length;
      const avgY = members.reduce((sum, m) => sum + m.screenY, 0) / members.length;
      const avgLat = members.reduce((sum, m) => sum + m.lat, 0) / members.length;
      const avgLon = members.reduce((sum, m) => sum + m.lon, 0) / members.length;

      clusters.push({
        id: members.map((m) => m.user_id).sort().join('_'),
        users: members,
        count: members.length,
        screenX: avgX,
        screenY: avgY,
        lat: avgLat,
        lon: avgLon
      });
    }

    return clusters;
  }, [locatedUsers, center.lat, center.lon, zoom, mapSize.width, mapSize.height]);

  // Compute visible map tiles
  const visibleTiles = useMemo(() => {
    const numTiles = Math.pow(2, zoom);
    const centerWorldX = lonToWorldX(center.lon, zoom);
    const centerWorldY = latToWorldY(center.lat, zoom);

    const topLeftWorldX = centerWorldX - mapSize.width / 2;
    const topLeftWorldY = centerWorldY - mapSize.height / 2;

    const startTileX = Math.floor(topLeftWorldX / TILE_SIZE) - 1;
    const endTileX = Math.floor((topLeftWorldX + mapSize.width) / TILE_SIZE) + 1;
    const startTileY = Math.floor(topLeftWorldY / TILE_SIZE) - 1;
    const endTileY = Math.floor((topLeftWorldY + mapSize.height) / TILE_SIZE) + 1;

    const provider = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.voyager;
    const tiles = [];

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        if (ty < 0 || ty >= numTiles) continue;
        const wrappedTx = ((tx % numTiles) + numTiles) % numTiles;
        const left = Math.round(tx * TILE_SIZE - topLeftWorldX);
        const top = Math.round(ty * TILE_SIZE - topLeftWorldY);
        tiles.push({
          key: `${mapStyle}_${zoom}_${tx}_${ty}`,
          src: provider.url(zoom, wrappedTx, ty),
          left,
          top
        });
      }
    }
    return tiles;
  }, [center.lat, center.lon, zoom, mapSize.width, mapSize.height, mapStyle]);

  // Mouse / touch pan handlers
  const handlePointerDown = (e) => {
    if (e.target.closest('.tracker-marker') || e.target.closest('.tracker-control')) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startWorldX: lonToWorldX(center.lon, zoom),
      startWorldY: latToWorldY(center.lat, zoom)
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const newWorldX = dragStartRef.current.startWorldX - dx;
    const newWorldY = dragStartRef.current.startWorldY - dy;
    const maxWorld = TILE_SIZE * Math.pow(2, zoom);
    const clampedWorldY = Math.max(0, Math.min(maxWorld, newWorldY));

    let newLon = worldXToLon(newWorldX, zoom);
    while (newLon > 180) newLon -= 360;
    while (newLon < -180) newLon += 360;
    const newLat = worldYToLat(clampedWorldY, zoom);

    setCenter({ lat: newLat, lon: newLon });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  };

  const handleFocusUser = (user) => {
    setSelectedUserId(user.user_id);
    if (user.has_location && Number.isFinite(Number(user.latitude)) && Number.isFinite(Number(user.longitude))) {
      setCenter({ lat: Number(user.latitude), lon: Number(user.longitude) });
      setZoom((prev) => Math.max(prev, 15));
    }
  };

  const handleCheckInCurrentLocation = () => {
    if (!navigator.geolocation) {
      if (showToast) showToast('Geolocation is not supported by this browser', 'error');
      return;
    }
    setCheckingIn(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const point = {
            id: `web_loc_${Date.now()}`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 10) / 10 : null,
            heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
            recordedAt: new Date(pos.timestamp || Date.now()).toISOString(),
            userId: currentUser?.id,
            userName: currentUser?.display_name || currentUser?.username
          };
          const res = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(point)
          });
          if (!res.ok) throw new Error('Failed to save location');
          if (showToast) showToast('Your current location has been updated!', 'success');
          await fetchLocations(true);
          setCenter({ lat: point.latitude, lon: point.longitude });
          setZoom(15);
        } catch (err) {
          if (showToast) showToast(err.message || 'Could not update location', 'error');
        } finally {
          setCheckingIn(false);
        }
      },
      (err) => {
        setCheckingIn(false);
        if (showToast) showToast(err.message || 'Location permission denied', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClusterMouseEnter = (clusterId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredClusterId(clusterId);
  };

  const handleClusterMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredClusterId(null);
    }, 180);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MapPin size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Family Tracker</h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: connectedUsers.length > 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                  color: connectedUsers.length > 0 ? '#10b981' : '#f59e0b',
                  border: `1px solid ${connectedUsers.length > 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: connectedUsers.length > 0 ? '#10b981' : '#f59e0b'
                  }}
                />
                {connectedUsers.length > 0
                  ? `Android App Connected (${connectedUsers.length} Active)`
                  : 'Waiting for Android App Connection'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              Live family locations synced from <strong>Family Companion (Android)</strong> •{' '}
              {locatedUsers.length} of {users.length} member{users.length === 1 ? '' : 's'} reporting GPS
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
          {/* Map Theme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={15} style={{ color: 'var(--muted-foreground)' }} />
            <select
              className="input-control"
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
            >
              {Object.entries(TILE_PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fitAllUsersOnMap(locatedUsers)}
            disabled={locatedUsers.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Center map to fit all family members"
          >
            <Maximize2 size={15} />
            <span>Fit All</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCheckInCurrentLocation}
            disabled={checkingIn}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Share your current location from this device"
          >
            <LocateFixed size={15} />
            <span>{checkingIn ? 'Locating...' : 'Check In Here'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fetchLocations(false)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Interactive Map + Member Roster */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: '1.25rem',
          alignItems: 'start'
        }}
        className="family-tracker-grid"
      >
        {/* Interactive Map Container */}
        <div
          ref={mapContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            height: '580px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: mapStyle === 'dark' ? '#0f172a' : '#e2e8f0',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
          }}
        >
          {/* Slippy Map Tiles Layer */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {visibleTiles.map((t) => (
              <img
                key={t.key}
                src={t.src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${t.left}px`,
                  top: `${t.top}px`,
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  display: 'block',
                  userSelect: 'none'
                }}
              />
            ))}
          </div>

          {/* Markers Layer */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {mapClusters.map((cluster) => {
              const isMulti = cluster.count > 1;
              const isHovered = hoveredClusterId === cluster.id;
              const singleUser = cluster.users[0];
              const isSelected =
                !isMulti && singleUser && String(singleUser.user_id) === String(selectedUserId);

              // Skip rendering off-screen markers with wide margin
              if (
                cluster.screenX < -80 ||
                cluster.screenX > mapSize.width + 80 ||
                cluster.screenY < -80 ||
                cluster.screenY > mapSize.height + 80
              ) {
                return null;
              }

              return (
                <div
                  key={cluster.id}
                  className="tracker-marker"
                  onMouseEnter={() => handleClusterMouseEnter(cluster.id)}
                  onMouseLeave={handleClusterMouseLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMulti) {
                      setCenter({ lat: cluster.lat, lon: cluster.lon });
                      setZoom((prev) => Math.min(MAX_ZOOM, prev + 2));
                    } else if (singleUser) {
                      handleFocusUser(singleUser);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${cluster.screenX}px`,
                    top: `${cluster.screenY}px`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    zIndex: isHovered ? 1000 : isSelected ? 500 : 100
                  }}
                >
                  {/* Hover Popover for Multi-User Cluster OR Single User */}
                  {isHovered && (
                    <div
                      onMouseEnter={() => handleClusterMouseEnter(cluster.id)}
                      onMouseLeave={handleClusterMouseLeave}
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 12px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        minWidth: isMulti ? '250px' : '220px',
                        maxWidth: '300px',
                        background: 'var(--card-bg, #1e293b)',
                        color: 'var(--foreground, #f8fafc)',
                        border: '1px solid var(--border, rgba(255,255,255,0.15))',
                        borderRadius: '14px',
                        padding: '0.75rem',
                        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.45)',
                        zIndex: 1200,
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      {isMulti ? (
                        <>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              color: '#3b82f6',
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{cluster.count} Users at This Location</span>
                            <Users size={14} />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              maxHeight: '210px',
                              overflowY: 'auto'
                            }}
                          >
                            {cluster.users.map((u) => (
                              <div
                                key={u.user_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFocusUser(u);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.6rem',
                                  padding: '0.35rem 0.45rem',
                                  borderRadius: '10px',
                                  background: 'rgba(59, 130, 246, 0.08)'
                                }}
                              >
                                <UserAvatarBadge
                                  user={u}
                                  size={32}
                                  borderWidth={2}
                                  showShadow={false}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '0.84rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {u.display_name || u.username}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--muted-foreground)'
                                    }}
                                  >
                                    {formatRelativeTime(u.recorded_at)}
                                    {u.accuracy ? ` • ±${Math.round(u.accuracy)}m` : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        singleUser && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <UserAvatarBadge
                                user={singleUser}
                                size={36}
                                borderWidth={2}
                                showShadow={false}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                  {singleUser.display_name || singleUser.username}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: 'var(--muted-foreground)' }}>
                                  {singleUser.role_name || 'Family Member'}
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--muted-foreground)',
                                borderTop: '1px solid var(--border)',
                                paddingTop: '0.4rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.2rem'
                              }}
                            >
                              <div>
                                <strong>Updated:</strong> {formatRelativeTime(singleUser.recorded_at)}{' '}
                                ({formatExactTime(singleUser.recorded_at)})
                              </div>
                              <div>
                                <strong>Coords:</strong> {Number(singleUser.latitude).toFixed(5)},{' '}
                                {Number(singleUser.longitude).toFixed(5)}
                              </div>
                              {singleUser.accuracy ? (
                                <div>
                                  <strong>Accuracy:</strong> ±{Math.round(singleUser.accuracy)}m
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Pin Visual: Number Badge if > 1 user, Profile Avatar if 1 user */}
                  {isMulti ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                          border: '3px solid #ffffff',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          boxShadow:
                            '0 8px 20px rgba(37, 99, 235, 0.55), 0 0 0 6px rgba(59, 130, 246, 0.22)',
                          transition: 'transform 0.15s ease',
                          transform: isHovered ? 'scale(1.12)' : 'scale(1)'
                        }}
                      >
                        {cluster.count}
                      </div>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '7px solid transparent',
                          borderRight: '7px solid transparent',
                          borderTop: '9px solid #1d4ed8',
                          marginTop: '-1px'
                        }}
                      />
                    </div>
                  ) : (
                    singleUser && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transform: isHovered || isSelected ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <div
                          style={{
                            borderRadius: '50%',
                            padding: '2px',
                            background: singleUser.primary_color || '#3b82f6',
                            boxShadow: isSelected
                              ? '0 0 0 6px rgba(59, 130, 246, 0.35), 0 8px 20px rgba(0,0,0,0.4)'
                              : '0 6px 16px rgba(0,0,0,0.35)'
                          }}
                        >
                          <UserAvatarBadge
                            user={singleUser}
                            size={44}
                            borderColor="#ffffff"
                            borderWidth={2}
                            showShadow={false}
                          />
                        </div>
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `8px solid ${singleUser.primary_color || '#3b82f6'}`,
                            marginTop: '-1px'
                          }}
                        />
                        <div
                          style={{
                            marginTop: '3px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}
                        >
                          {singleUser.display_name || singleUser.username}
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty State Overlay if no locations recorded yet */}
          {!loading && locatedUsers.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                zIndex: 800
              }}
            >
              <div
                className="card"
                style={{
                  maxWidth: '420px',
                  textAlign: 'center',
                  padding: '1.75rem'
                }}
              >
                <Smartphone size={36} style={{ color: '#3b82f6', marginBottom: '0.75rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
                  No Family Locations Synced Yet
                </h3>
                <p
                  style={{
                    margin: '0 0 1.25rem',
                    fontSize: '0.85rem',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}
                >
                  Open the <strong>Family Companion</strong> Android app with location tracking enabled to automatically sync family member locations, or click below to check in from this browser.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCheckInCurrentLocation}
                  disabled={checkingIn}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <LocateFixed size={16} />
                  <span>{checkingIn ? 'Checking In...' : 'Check In My Location Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Map Zoom Controls */}
          <div
            className="tracker-control"
            style={{
              position: 'absolute',
              right: '14px',
              bottom: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 900
            }}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
          </div>

          {/* Map Attribution Footer */}
          <div
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '6px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.65)',
              color: '#cbd5e1',
              fontSize: '0.68rem',
              pointerEvents: 'none',
              zIndex: 850
            }}
          >
            {(TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.voyager).attribution}
          </div>
        </div>

        {/* Family Members Roster Panel */}
        <div
          className="card"
          style={{
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            maxHeight: '580px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Users size={18} style={{ color: '#3b82f6' }} />
              <span>Household Members</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                fontWeight: 600
              }}
            >
              {connectedUsers.length}/{users.length} Active
            </span>
          </div>

          {users.map((u) => {
            const isSelected = String(u.user_id) === String(selectedUserId);
            const isActive = Boolean(u.is_app_connected || u.has_location);
            return (
              <div
                key={u.user_id}
                onClick={() => handleFocusUser(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: isSelected
                    ? '1px solid #3b82f6'
                    : '1px solid var(--border)',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(255, 255, 255, 0.02)',
                  cursor: u.has_location ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserAvatarBadge
                  user={u}
                  size={42}
                  borderColor={isActive ? (u.primary_color || '#10b981') : '#64748b'}
                  borderWidth={2}
                  showShadow={false}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem'
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {u.display_name || u.username}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: u.is_app_connected
                          ? 'rgba(16, 185, 129, 0.15)'
                          : u.has_location
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: u.is_app_connected
                          ? '#10b981'
                          : u.has_location
                          ? '#3b82f6'
                          : '#94a3b8',
                        flexShrink: 0
                      }}
                      title={
                        u.is_app_connected
                          ? 'Android app connected & active'
                          : u.has_location
                          ? 'Last known GPS location available'
                          : 'No location reported yet'
                      }
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: u.is_app_connected
                            ? '#10b981'
                            : u.has_location
                            ? '#3b82f6'
                            : '#94a3b8'
                        }}
                      />
                      {u.is_app_connected ? 'Connected' : u.has_location ? 'Located' : 'Offline'}
                    </span>
                  </div>

                  {u.has_location ? (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--muted-foreground)',
                        marginTop: '0.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} />
                        <span>{formatRelativeTime(u.last_active_at || u.recorded_at)}</span>
                        {u.accuracy ? <span>• ±{Math.round(u.accuracy)}m</span> : null}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.85 }}>
                        {Number(u.latitude).toFixed(4)}, {Number(u.longitude).toFixed(4)}
                      </div>
                    </div>
                  ) : u.is_app_connected ? (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        marginTop: '0.2rem'
                      }}
                    >
                      Android app connected • Acquiring GPS...
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--muted-foreground)',
                        marginTop: '0.2rem'
                      }}
                    >
                      Waiting for Android app sync...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .family-tracker-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
