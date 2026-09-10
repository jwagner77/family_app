import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Cake, 
  Image, 
  Calendar, 
  Plus, 
  Trash2, 
  Palette, 
  Clock, 
  Sun, 
  Moon, 
  Sliders, 
  Lock, 
  Save, 
  RotateCcw,
  Users,
  Sparkles,
  ArrowRightLeft,
  Check
} from 'lucide-react';

// --- COLOR & GRADIENT HELPERS ---
function getValidColorPickerValue(colorStr) {
  if (!colorStr) return '#3f51b5';
  let s = colorStr.trim();
  if (!s.startsWith('#')) {
    s = '#' + s;
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s;
  }
  return '#3f51b5';
}

function hexToRgb(hex) {
  if (!hex) return { r: 63, g: 81, b: 181 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (c.length !== 6) return { r: 63, g: 81, b: 181 };
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 63, g: 81, b: 181 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.min(255, Math.max(0, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function adjustHexBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = (100 + percent) / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function shiftHexHue(hex, degree) {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  h = (h + degree / 360) % 1;
  if (h < 0) h += 1;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let newR, newG, newB;
  if (s === 0) {
    newR = newG = newB = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    newR = hue2rgb(p, q, h + 1/3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1/3);
  }

  return rgbToHex(newR * 255, newG * 255, newB * 255);
}

function getDynamicAccentGradient(hex) {
  const validHex = getValidColorPickerValue(hex);
  const colorLight = adjustHexBrightness(validHex, 20);
  const colorMid = validHex;
  const colorDeep = shiftHexHue(adjustHexBrightness(validHex, -35), 25);
  return `linear-gradient(135deg, ${colorLight} 0%, ${colorMid} 50%, ${colorDeep} 100%)`;
}

const PRELOADED_PATTERNS = [
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    value: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 50%, #c084fc 100%)',
    color: '#7c3aed'
  },
  {
    id: 'sunset_glow',
    name: 'Sunset Glow',
    value: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    color: '#f12711'
  },
  {
    id: 'deep_space',
    name: 'Deep Space',
    value: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    color: '#2a2a2a'
  },
  {
    id: 'nordic_forest',
    name: 'Nordic Forest',
    value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    color: '#387858'
  },
  {
    id: 'lavender_fields',
    name: 'Lavender Fields',
    value: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)',
    color: '#e94057'
  },
  {
    id: 'midnight_city',
    name: 'Midnight City',
    value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    color: '#203a43'
  }
];

export default function UserProfileView({ showToast, currentUser, onProfileUpdate }) {
  // Profile fields state
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [birthday, setBirthday] = useState(currentUser?.birthday || '');
  const [pictureUrl, setPictureUrl] = useState(currentUser?.picture_url || '');

  // Helper to parse gradient colors
  const parseGradientColors = (bgStr) => {
    if (!bgStr || typeof bgStr !== 'string' || !bgStr.startsWith('linear-gradient')) {
      return { c1: '#4f46e5', c2: '#ec4899' };
    }
    const hexMatches = bgStr.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
    if (hexMatches && hexMatches.length >= 2) {
      return { c1: hexMatches[0], c2: hexMatches[hexMatches.length - 1] };
    }
    return { c1: '#4f46e5', c2: '#ec4899' };
  };

  // Move General Settings state
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'US/New_York');
  const [primaryColor, setPrimaryColor] = useState(currentUser?.primary_color || '#3f51b5');
  const [navbarBg, setNavbarBg] = useState(currentUser?.navbar_bg || '');
  const [appBg, setAppBg] = useState(currentUser?.app_bg || '');
  const [theme, setTheme] = useState(currentUser?.theme || 'system');
  const [navbarOpacity, setNavbarOpacity] = useState(currentUser?.navbar_opacity !== undefined && currentUser?.navbar_opacity !== null ? currentUser.navbar_opacity : 0.75);
  const [themeInfoCards, setThemeInfoCards] = useState(currentUser?.theme_info_cards === 1 || currentUser?.theme_info_cards === true);
  const [textColor, setTextColor] = useState(currentUser?.text_color || 'white');
  const [dynamicTextColor, setDynamicTextColor] = useState(currentUser?.dynamic_text_color === 1 || currentUser?.dynamic_text_color === true);
  const [unsplashTarget, setUnsplashTarget] = useState('navbar');

  // Custom 2-color gradient state
  const [customGrad1, setCustomGrad1] = useState(() => parseGradientColors(currentUser?.navbar_bg).c1);
  const [customGrad2, setCustomGrad2] = useState(() => parseGradientColors(currentUser?.navbar_bg).c2);
  const [isDynamicAccentSelected, setIsDynamicAccentSelected] = useState(() => {
    const bg = currentUser?.navbar_bg || '';
    const dyn = getDynamicAccentGradient(currentUser?.primary_color || '#3f51b5');
    return bg === dyn;
  });

  // Unsplash search state
  const [isUnsplashModalOpen, setIsUnsplashModalOpen] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [searchingUnsplash, setSearchingUnsplash] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Anniversaries & Shared Dates state
  const [importantDates, setImportantDates] = useState([]);
  const [newDateName, setNewDateName] = useState('');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateShareType, setNewDateShareType] = useState('none'); // 'none', 'user', 'contact'
  const [newDateShareUser, setNewDateShareUser] = useState('');
  const [newDateShareContact, setNewDateShareContact] = useState('');
  const [contacts, setContacts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loadingDates, setLoadingDates] = useState(true);

  useEffect(() => {
    fetchImportantDates();
    fetchContactsAndUsers();
  }, []);

  const fetchImportantDates = async () => {
    try {
      const res = await fetch('/api/users/profile/important-dates');
      if (!res.ok) throw new Error('Failed to fetch important dates');
      const data = await res.json();
      setImportantDates(data);
    } catch (err) {
      console.error(err);
      showToast('Error loading important dates', 'error');
    } finally {
      setLoadingDates(false);
    }
  };

  const fetchContactsAndUsers = async () => {
    try {
      // Fetch contacts
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }

      // Fetch users
      const usersRes = await fetch('/api/users/assignable');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Exclude current user from sharing target options
        setUsersList(usersData.filter(u => u.id !== currentUser?.id));
      }
    } catch (err) {
      console.error('Error fetching contacts or users:', err);
    }
  };

  const handleNavbarBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = async () => {
      let extractedHex = primaryColor;
      try {
        extractedHex = extractColorFromImage(img);
        setPrimaryColor(extractedHex);
      } catch (err) {}
      URL.revokeObjectURL(tempUrl);

      const formData = new FormData();
      formData.append('navbar_bg', file);
      try {
        const res = await fetch('/api/users/profile/navbar-bg', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload navbar background');
        
        autoSaveProfile({ navbar_bg: data.url, primary_color: extractedHex });
        showToast('Image uploaded and theme accent color matched! 🎨');
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      }
    };
    img.src = tempUrl;
  };

  const autoSaveProfile = async (patch) => {
    const newDisplayName = patch.display_name !== undefined ? patch.display_name : displayName;
    const newPhone = patch.phone !== undefined ? patch.phone : phone;
    const newEmail = patch.email !== undefined ? patch.email : email;
    const newBirthday = patch.birthday !== undefined ? patch.birthday : birthday;
    const newPictureUrl = patch.picture_url !== undefined ? patch.picture_url : pictureUrl;
    const newTimezone = patch.timezone !== undefined ? patch.timezone : timezone;
    let newPrimaryColor = patch.primary_color !== undefined ? patch.primary_color : primaryColor;
    const newTheme = patch.theme !== undefined ? patch.theme : theme;
    const newNavbarBg = patch.navbar_bg !== undefined ? patch.navbar_bg : navbarBg;
    const newNavbarOpacity = patch.navbar_opacity !== undefined ? patch.navbar_opacity : navbarOpacity;
    const newAppBg = patch.app_bg !== undefined ? patch.app_bg : appBg;
    const newThemeInfoCards = patch.theme_info_cards !== undefined ? patch.theme_info_cards : themeInfoCards;
    const newTextColor = patch.text_color !== undefined ? patch.text_color : textColor;
    const newDynamicTextColor = patch.dynamic_text_color !== undefined ? patch.dynamic_text_color : dynamicTextColor;

    if (newPrimaryColor && typeof newPrimaryColor === 'string') {
      newPrimaryColor = newPrimaryColor.trim();
      if (!newPrimaryColor.startsWith('#')) {
        newPrimaryColor = '#' + newPrimaryColor;
      }
    }

    if (patch.display_name !== undefined) setDisplayName(patch.display_name);
    if (patch.phone !== undefined) setPhone(patch.phone);
    if (patch.email !== undefined) setEmail(patch.email);
    if (patch.birthday !== undefined) setBirthday(patch.birthday);
    if (patch.picture_url !== undefined) setPictureUrl(patch.picture_url);
    if (patch.timezone !== undefined) setTimezone(patch.timezone);
    if (patch.primary_color !== undefined) setPrimaryColor(newPrimaryColor);
    if (patch.theme !== undefined) setTheme(patch.theme);
    if (patch.navbar_bg !== undefined) setNavbarBg(patch.navbar_bg);
    if (patch.navbar_opacity !== undefined) setNavbarOpacity(patch.navbar_opacity);
    if (patch.app_bg !== undefined) setAppBg(patch.app_bg);
    if (patch.theme_info_cards !== undefined) setThemeInfoCards(patch.theme_info_cards);
    if (patch.text_color !== undefined) setTextColor(patch.text_color);
    if (patch.dynamic_text_color !== undefined) setDynamicTextColor(patch.dynamic_text_color);

    const userPayload = {
      ...currentUser,
      display_name: newDisplayName,
      phone: newPhone,
      email: newEmail,
      birthday: newBirthday,
      picture_url: newPictureUrl,
      timezone: newTimezone,
      primary_color: newPrimaryColor,
      theme: newTheme,
      navbar_bg: newNavbarBg,
      navbar_opacity: newNavbarOpacity,
      app_bg: newAppBg,
      theme_info_cards: newThemeInfoCards ? 1 : 0,
      text_color: newTextColor,
      dynamic_text_color: newDynamicTextColor ? 1 : 0
    };

    if (onProfileUpdate) {
      onProfileUpdate(userPayload);
    }

    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: newDisplayName,
          phone: newPhone,
          email: newEmail,
          birthday: newBirthday,
          picture_url: newPictureUrl,
          timezone: newTimezone,
          primary_color: newPrimaryColor,
          theme: newTheme,
          navbar_bg: newNavbarBg,
          navbar_opacity: newNavbarOpacity,
          app_bg: newAppBg,
          theme_info_cards: newThemeInfoCards,
          text_color: newTextColor,
          dynamic_text_color: newDynamicTextColor
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-save profile');
      if (onProfileUpdate && data.user) {
        onProfileUpdate(data.user);
      }
    } catch (err) {
      console.error('Error auto-saving profile setting:', err);
    }
  };

  const handleSelectPattern = (pattern) => {
    setIsDynamicAccentSelected(false);
    setNavbarBg(pattern.value);
    setPrimaryColor(pattern.color);
    autoSaveProfile({ navbar_bg: pattern.value, primary_color: pattern.color });
    showToast(`Applied ${pattern.name} pattern! 🎨`);
  };

  const handleSelectDynamicAccent = () => {
    const dynGrad = getDynamicAccentGradient(primaryColor);
    setIsDynamicAccentSelected(true);
    setNavbarBg(dynGrad);
    autoSaveProfile({ navbar_bg: dynGrad });
    showToast('Applied Dynamic Accent Theme! ✨');
  };

  const handleSelectCustomGradient = (c1Override, c2Override) => {
    setIsDynamicAccentSelected(false);
    const c1 = c1Override || customGrad1;
    const c2 = c2Override || customGrad2;
    const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    setNavbarBg(grad);
    autoSaveProfile({ navbar_bg: grad });
    showToast('Applied Custom Gradient Theme! 🎨');
  };

  const handleCustomGradColorChange = (which, newColor) => {
    const valid = getValidColorPickerValue(newColor);
    let c1 = customGrad1;
    let c2 = customGrad2;
    if (which === 1) {
      setCustomGrad1(valid);
      c1 = valid;
    } else {
      setCustomGrad2(valid);
      c2 = valid;
    }
    const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    setNavbarBg(grad);
    setIsDynamicAccentSelected(false);
    autoSaveProfile({ navbar_bg: grad });
  };

  const handleSwapCustomGradColors = () => {
    const c1 = customGrad2;
    const c2 = customGrad1;
    setCustomGrad1(c1);
    setCustomGrad2(c2);
    const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    setNavbarBg(grad);
    setIsDynamicAccentSelected(false);
    autoSaveProfile({ navbar_bg: grad });
    showToast('Swapped gradient colors! ⇄');
  };

  const handleAccentColorChange = (newColor) => {
    setPrimaryColor(newColor);
    const validHex = getValidColorPickerValue(newColor);
    
    // If the user currently has the Dynamic Accent theme active, dynamically update navbar_bg!
    if (isDynamicAccentSelected || navbarBg === getDynamicAccentGradient(primaryColor)) {
      const newDynamicGrad = getDynamicAccentGradient(validHex);
      setNavbarBg(newDynamicGrad);
      setIsDynamicAccentSelected(true);
      autoSaveProfile({ primary_color: validHex, navbar_bg: newDynamicGrad });
    } else {
      autoSaveProfile({ primary_color: validHex });
    }
  };

  const handleRemoveNavbarBg = () => {
    setIsDynamicAccentSelected(false);
    setNavbarBg('');
    autoSaveProfile({ navbar_bg: '' });
    showToast('Navbar background pattern removed');
  };

  const handleSearchUnsplash = async (e) => {
    if (e) e.preventDefault();
    if (!unsplashQuery.trim()) return;
    setSearchingUnsplash(true);
    try {
      const res = await fetch(`/api/unsplash/search?query=${encodeURIComponent(unsplashQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search Unsplash');
      setUnsplashResults(data.results || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error querying Unsplash API', 'error');
    } finally {
      setSearchingUnsplash(false);
    }
  };

  const handleSelectUnsplashImage = (regularUrl) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let extractedHex = primaryColor;
      try {
        extractedHex = extractColorFromImage(img);
        setPrimaryColor(extractedHex);
      } catch (err) {}

      if (unsplashTarget === 'app') {
        setAppBg(regularUrl);
        autoSaveProfile({ app_bg: regularUrl, primary_color: extractedHex });
      } else {
        setNavbarBg(regularUrl);
        autoSaveProfile({ navbar_bg: regularUrl, primary_color: extractedHex });
      }

      setIsUnsplashModalOpen(false);
      showToast('Successfully applied Unsplash background theme! 🎨');
    };
    img.onerror = () => {
      if (unsplashTarget === 'app') {
        setAppBg(regularUrl);
        autoSaveProfile({ app_bg: regularUrl });
      } else {
        setNavbarBg(regularUrl);
        autoSaveProfile({ navbar_bg: regularUrl });
      }
      setIsUnsplashModalOpen(false);
      showToast('Applied Unsplash image direct link');
    };
    img.src = regularUrl;
  };

  const handleAppBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = async () => {
      let extractedHex = primaryColor;
      try {
        extractedHex = extractColorFromImage(img);
        setPrimaryColor(extractedHex);
      } catch (err) {}
      URL.revokeObjectURL(tempUrl);

      const formData = new FormData();
      formData.append('wallpaper', file);
      try {
        const res = await fetch('/api/users/profile/wallpaper', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload wallpaper');
        
        autoSaveProfile({ app_bg: data.url, primary_color: extractedHex });
        showToast('App wallpaper background uploaded and color theme matched! 🎨');
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      }
    };
    img.src = tempUrl;
  };

  const handleRemoveAppBg = () => {
    setAppBg('');
    autoSaveProfile({ app_bg: '' });
    showToast('App wallpaper background removed');
  };

  const handleAddImportantDate = async (e) => {
    e.preventDefault();
    if (!newDateName.trim() || !newDateValue) {
      showToast('Please fill in both Date Name and Date Value', 'error');
      return;
    }

    try {
      const body = {
        name: newDateName,
        date: newDateValue,
        shared_with_type: newDateShareType,
        shared_with_user_id: newDateShareType === 'user' ? parseInt(newDateShareUser) || null : null,
        shared_with_contact_id: newDateShareType === 'contact' ? parseInt(newDateShareContact) || null : null
      };

      const res = await fetch('/api/users/important-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add date');
      }

      showToast('Shared date added successfully!');
      setNewDateName('');
      setNewDateValue('');
      setNewDateShareType('none');
      setNewDateShareUser('');
      setNewDateShareContact('');
      fetchImportantDates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteImportantDate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this date?')) return;
    try {
      const res = await fetch(`/api/users/important-dates/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete date');
      showToast('Shared date deleted!');
      fetchImportantDates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Current and New password fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const getSharedName = (date) => {
    if (date.shared_with_type === 'user') {
      const matched = usersList.find(u => u.id === date.shared_with_user_id);
      return matched ? `User: ${matched.display_name || matched.username}` : 'User';
    } else if (date.shared_with_type === 'contact') {
      const matched = contacts.find(c => c.id === date.shared_with_contact_id);
      return matched ? `Contact: ${matched.name}` : 'Contact';
    }
    return 'None';
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '1rem 0' }}>
      <div className="content-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>User Profile</h2>
          <p>Manage your preferred user settings, personal details, anniversaries, and security.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* PROFILE PICTURE AND MAIN DETAILS */}
        <div className="card" style={{ position: 'relative' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            <User size={18} /> Personal Details
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {pictureUrl ? (
                <img 
                  src={pictureUrl} 
                  alt={displayName || currentUser?.username} 
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
              ) : (
                <div 
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '2rem',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {(displayName || currentUser?.username || 'U').substring(0, 2).toUpperCase()}
                </div>
              )}
              
              <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="profile-picture-url" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Image size={14} /> Profile Picture URL
                  </label>
                  <input 
                    id="profile-picture-url"
                    type="url" 
                    className="input-control" 
                    value={pictureUrl}
                    onChange={(e) => setPictureUrl(e.target.value)}
                    onBlur={(e) => autoSaveProfile({ picture_url: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-display-name">Display Name (Preferred Name)</label>
                <input 
                  id="profile-display-name"
                  type="text" 
                  className="input-control" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={(e) => autoSaveProfile({ display_name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  placeholder="e.g. Joshua"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-birthday" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Cake size={14} /> Birthday
                </label>
                <input 
                  id="profile-birthday"
                  type="date" 
                  className="input-control" 
                  value={birthday}
                  onChange={(e) => {
                    setBirthday(e.target.value);
                    autoSaveProfile({ birthday: e.target.value });
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-phone" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Phone size={14} /> Phone Number
                </label>
                <input 
                  id="profile-phone"
                  type="tel" 
                  className="input-control" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => autoSaveProfile({ phone: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  placeholder="e.g. 555-0199"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-email" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Mail size={14} /> Email Address
                </label>
                <input 
                  id="profile-email"
                  type="email" 
                  className="input-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => autoSaveProfile({ email: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  placeholder="e.g. joshua@wagnertech.com"
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

            {/* THEME & APPEARANCE (MOVED FROM SETTINGS) */}
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', marginTop: '0.5rem' }}>
              <Palette size={16} /> Theme & Preferences
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-timezone" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Clock size={14} /> Time Zone
                </label>
                <select 
                  id="profile-timezone"
                  className="input-control" 
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    autoSaveProfile({ timezone: e.target.value });
                  }}
                >
                  <option value="US/New_York">Eastern Time (US/New_York)</option>
                  <option value="US/Central">Central Time (US/Central)</option>
                  <option value="US/Mountain">Mountain Time (US/Mountain)</option>
                  <option value="US/Pacific">Pacific Time (US/Pacific)</option>
                  <option value="US/Alaska">Alaska/Anchorage Time (US/Alaska)</option>
                  <option value="US/Hawaii">Hawaii Time (US/Hawaii)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-accent-color">Theme Accent Color</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={getValidColorPickerValue(primaryColor)}
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                  <input 
                    type="text" 
                    className="input-control"
                    value={primaryColor} 
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    onBlur={(e) => handleAccentColorChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    placeholder="#3f51b5"
                    maxLength={7}
                    style={{ width: '100px', fontFamily: 'monospace', fontWeight: '600' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Theme Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div 
                  onClick={() => autoSaveProfile({ theme: 'system' })}
                  style={{ 
                    padding: '0.5rem', 
                    border: `1px solid ${theme === 'system' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    background: theme === 'system' ? 'var(--accent)' : 'transparent',
                    fontSize: '0.875rem'
                  }}
                >
                  <Sliders size={14} /> System
                </div>
                <div 
                  onClick={() => autoSaveProfile({ theme: 'light' })}
                  style={{ 
                    padding: '0.5rem', 
                    border: `1px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    background: theme === 'light' ? 'var(--accent)' : 'transparent',
                    fontSize: '0.875rem'
                  }}
                >
                  <Sun size={14} /> Light
                </div>
                <div 
                  onClick={() => autoSaveProfile({ theme: 'dark' })}
                  style={{ 
                    padding: '0.5rem', 
                    border: `1px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    background: theme === 'dark' ? 'var(--accent)' : 'transparent',
                    fontSize: '0.875rem'
                  }}
                >
                  <Moon size={14} /> Dark
                </div>
              </div>
            </div>

            {/* Navbar background & dynamic color engine */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Palette size={15} style={{ color: 'var(--primary)' }} /> Navbar Background & Dynamic Colors
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  Upload any image or pattern from your device, or choose from the built-in library. The app's color palette will dynamically match your selection.
                </p>
              </div>

              {/* Upload input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8125rem' }}>Set Custom Image or Pattern</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleNavbarBgUpload}
                    className="input-control"
                    style={{ fontSize: '0.75rem', padding: '0.25rem', flex: 1, minWidth: '150px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => { setUnsplashTarget('navbar'); setIsUnsplashModalOpen(true); }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', height: '36px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
                  >
                    🔍 Find on Unsplash
                  </button>
                  {navbarBg && (
                    <button 
                      type="button" 
                      onClick={handleRemoveNavbarBg}
                      className="btn btn-outline btn-danger"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 0.75rem', flexShrink: 0 }}
                    >
                      Remove Background
                    </button>
                  )}
                </div>
              </div>

              {/* Opacity Control Slider */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Navbar Glass Transparency</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{Math.round(navbarOpacity * 100)}%</span>
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    value={navbarOpacity} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNavbarOpacity(val);
                      document.documentElement.style.setProperty('--navbar-opacity', String(val));
                    }}
                    onMouseUp={(e) => autoSaveProfile({ navbar_opacity: parseFloat(e.target.value) })}
                    onTouchEnd={(e) => autoSaveProfile({ navbar_opacity: parseFloat(e.target.value) })}
                    style={{ flex: 1, height: '6px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>

              {/* Preloaded Patterns Grid & Custom Themes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8125rem' }}>Or Choose a Pre-loaded Theme Pattern</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
                  
                  {/* 1. Dynamic Accent Pattern (Driven by Theme Accent Color) */}
                  <div 
                    onClick={handleSelectDynamicAccent}
                    style={{
                      height: '42px',
                      borderRadius: 'var(--radius)',
                      background: getDynamicAccentGradient(primaryColor),
                      border: isDynamicAccentSelected || navbarBg === getDynamicAccentGradient(primaryColor) ? '2px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                      boxSizing: 'border-box',
                      transition: 'transform 0.15s ease',
                      position: 'relative',
                      gap: '0.2rem'
                    }}
                    className="hover-lift"
                    title="Dynamic Theme based on your Theme Accent Color"
                  >
                    <Sparkles size={12} /> Dynamic Accent
                    {(isDynamicAccentSelected || navbarBg === getDynamicAccentGradient(primaryColor)) && (
                      <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.65rem' }}>✓</span>
                    )}
                  </div>

                  {/* 2. Pre-loaded Built-in Themes (Including Royal Purple) */}
                  {PRELOADED_PATTERNS.map((p, idx) => {
                    const isSelected = !isDynamicAccentSelected && navbarBg === p.value;
                    return (
                      <div 
                        key={idx}
                        onClick={() => handleSelectPattern(p)}
                        style={{
                          height: '42px',
                          borderRadius: 'var(--radius)',
                          background: p.value,
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '0.6875rem',
                          fontWeight: '700',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          boxSizing: 'border-box',
                          transition: 'transform 0.15s ease',
                          position: 'relative'
                        }}
                        className="hover-lift"
                        title={`Apply ${p.name}`}
                      >
                        {p.name}
                        {isSelected && (
                          <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.65rem' }}>✓</span>
                        )}
                      </div>
                    );
                  })}

                  {/* 3. Fully Custom Two-Color Gradient Tile */}
                  <div 
                    onClick={() => handleSelectCustomGradient()}
                    style={{
                      height: '42px',
                      borderRadius: 'var(--radius)',
                      background: `linear-gradient(135deg, ${customGrad1} 0%, ${customGrad2} 100%)`,
                      border: !isDynamicAccentSelected && navbarBg === `linear-gradient(135deg, ${customGrad1} 0%, ${customGrad2} 100%)` ? '2px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                      boxSizing: 'border-box',
                      transition: 'transform 0.15s ease',
                      position: 'relative',
                      gap: '0.2rem'
                    }}
                    className="hover-lift"
                    title="Fully Custom Two-Color Gradient Theme"
                  >
                    <Palette size={12} /> Custom Gradient
                    {(!isDynamicAccentSelected && navbarBg === `linear-gradient(135deg, ${customGrad1} 0%, ${customGrad2} 100%)`) && (
                      <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.65rem' }}>✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Two-Color Gradient Builder Controls */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Palette size={14} style={{ color: 'var(--primary)' }} /> Custom Two-Color Gradient
                  </span>
                  <button
                    type="button"
                    onClick={handleSwapCustomGradColors}
                    className="btn btn-outline"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Swap Color 1 and Color 2"
                  >
                    <ArrowRightLeft size={11} /> Swap Colors
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Color 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Color 1 (Start)</label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={getValidColorPickerValue(customGrad1)}
                        onChange={(e) => handleCustomGradColorChange(1, e.target.value)}
                        style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', padding: 0 }}
                      />
                      <input 
                        type="text" 
                        className="input-control"
                        value={customGrad1} 
                        onChange={(e) => handleCustomGradColorChange(1, e.target.value)}
                        maxLength={7}
                        style={{ width: '90px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: '600', padding: '0.25rem 0.5rem' }}
                      />
                    </div>
                  </div>

                  {/* Color 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Color 2 (End)</label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={getValidColorPickerValue(customGrad2)}
                        onChange={(e) => handleCustomGradColorChange(2, e.target.value)}
                        style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', padding: 0 }}
                      />
                      <input 
                        type="text" 
                        className="input-control"
                        value={customGrad2} 
                        onChange={(e) => handleCustomGradColorChange(2, e.target.value)}
                        maxLength={7}
                        style={{ width: '90px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: '600', padding: '0.25rem 0.5rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Gradient Preset Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginRight: '0.2rem' }}>Quick Pairings:</span>
                  {[
                    { label: 'Ocean Blue', c1: '#0284c7', c2: '#06b6d4' },
                    { label: 'Sunset Peach', c1: '#f97316', c2: '#ec4899' },
                    { label: 'Emerald Mint', c1: '#059669', c2: '#10b981' },
                    { label: 'Cyber Neon', c1: '#d946ef', c2: '#06b6d4' },
                    { label: 'Berry Rose', c1: '#be123c', c2: '#fb7185' }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCustomGrad1(preset.c1);
                        setCustomGrad2(preset.c2);
                        handleSelectCustomGradient(preset.c1, preset.c2);
                      }}
                      className="btn btn-outline"
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', height: '22px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: `linear-gradient(135deg, ${preset.c1}, ${preset.c2})`, display: 'inline-block' }}></span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navbar Preview Bar */}
              {navbarBg && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Active Navbar Background Preview:</div>
                  <div style={{ 
                    height: '44px', 
                    borderRadius: 'var(--radius)', 
                    backgroundImage: navbarBg.startsWith('linear-gradient') ? navbarBg : `url(${navbarBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1rem',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.8125rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    ✨ Dynamic Themed Preview
                  </div>
                </div>
              )}
            </div>

            {/* App Wallpaper Background & Dynamic Colors */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Image size={15} style={{ color: 'var(--primary)' }} /> App Wallpaper Background
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  Set a custom wallpaper background image for the entire application. The organic glowing waves will draw gracefully on top of it.
                </p>
              </div>

              {/* Upload or Choose from Unsplash */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8125rem' }}>Set Wallpaper Image</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAppBgUpload}
                    className="input-control"
                    style={{ fontSize: '0.75rem', padding: '0.25rem', flex: 1, minWidth: '150px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => { setUnsplashTarget('app'); setIsUnsplashModalOpen(true); }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', height: '36px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
                  >
                    🔍 Find on Unsplash
                  </button>
                  {appBg && (
                    <button 
                      type="button" 
                      onClick={handleRemoveAppBg}
                      className="btn btn-outline btn-danger"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 0.75rem', flexShrink: 0 }}
                    >
                      Remove Background
                    </button>
                  )}
                </div>
              </div>

              {/* App background preview panel */}
              {appBg && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Active Wallpaper Background Preview:</div>
                  <div style={{ 
                    height: '80px', 
                    borderRadius: 'var(--radius)', 
                    backgroundImage: `url(${appBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)'
                  }}>
                    🌄 App Background Wallpaper Active
                  </div>
                </div>
              )}
            </div>

            {/* Premium Theme & Text Behavior Switches Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>Theme & Text Readability Override Options</h4>
              
              {/* 1. Apply Theme to Info Cards Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <label htmlFor="theme-info-cards-toggle" style={{ fontSize: '0.8125rem', cursor: 'pointer', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontWeight: '500', color: 'var(--foreground)' }}>Apply Theme to Info Cards</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Match card backgrounds and text colors with the Sidebar Nav theme</span>
                </label>
                <label style={{ display: 'inline-flex', position: 'relative', width: '42px', height: '22px', cursor: 'pointer', borderRadius: '12px', background: themeInfoCards ? 'var(--primary)' : 'rgba(255,255,255,0.15)', transition: 'background 0.25s' }}>
                  <input 
                    id="theme-info-cards-toggle"
                    type="checkbox" 
                    checked={themeInfoCards}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setThemeInfoCards(val);
                      autoSaveProfile({ theme_info_cards: val });
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }} 
                  />
                  <span style={{ position: 'absolute', top: '2px', left: themeInfoCards ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                </label>
              </div>

              {/* 2. Text Color Toggle Switch (Black vs White) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <label htmlFor="text-color-toggle" style={{ fontSize: '0.8125rem', cursor: 'pointer', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontWeight: '500', color: 'var(--foreground)' }}>Force White Text Mode</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Toggle between White (Enabled) and Black (Disabled) text color overrides</span>
                </label>
                <label style={{ display: 'inline-flex', position: 'relative', width: '42px', height: '22px', cursor: 'pointer', borderRadius: '12px', background: textColor === 'white' ? 'var(--primary)' : 'rgba(255,255,255,0.15)', transition: 'background 0.25s' }}>
                  <input 
                    id="text-color-toggle"
                    type="checkbox" 
                    checked={textColor === 'white'}
                    onChange={(e) => {
                      const nextColor = e.target.checked ? 'white' : 'black';
                      setTextColor(nextColor);
                      autoSaveProfile({ text_color: nextColor });
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }} 
                  />
                  <span style={{ position: 'absolute', top: '2px', left: textColor === 'white' ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                </label>
              </div>

              {/* 3. Enable Dynamic Text Color Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <label htmlFor="dynamic-text-toggle" style={{ fontSize: '0.8125rem', cursor: 'pointer', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontWeight: '500', color: 'var(--foreground)' }}>Enable Dynamic Text Color</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Auto-calculate contrast text color based on wallpaper, background blur, and theme colors</span>
                </label>
                <label style={{ display: 'inline-flex', position: 'relative', width: '42px', height: '22px', cursor: 'pointer', borderRadius: '12px', background: dynamicTextColor ? 'var(--primary)' : 'rgba(255,255,255,0.15)', transition: 'background 0.25s' }}>
                  <input 
                    id="dynamic-text-toggle"
                    type="checkbox" 
                    checked={dynamicTextColor}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setDynamicTextColor(val);
                      autoSaveProfile({ dynamic_text_color: val });
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }} 
                  />
                  <span style={{ position: 'absolute', top: '2px', left: dynamicTextColor ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SHARED IMPORTANT DATES / ANNIVERSARIES */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            <Calendar size={18} /> Shared Important Dates & Anniversaries
          </h3>

          {/* Form to add a new shared date */}
          <form onSubmit={handleAddImportantDate} style={{ background: 'var(--accent)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Add New Important Date</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="new-date-name">Date Name (e.g. Wedding Anniversary)</label>
                <input 
                  id="new-date-name"
                  type="text" 
                  className="input-control" 
                  placeholder="Anniversary"
                  value={newDateName}
                  onChange={(e) => setNewDateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="new-date-val">Date</label>
                <input 
                  id="new-date-val"
                  type="date" 
                  className="input-control" 
                  value={newDateValue}
                  onChange={(e) => setNewDateValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="new-date-share-type">Link / Share With</label>
                <select 
                  id="new-date-share-type"
                  className="input-control" 
                  value={newDateShareType}
                  onChange={(e) => {
                    setNewDateShareType(e.target.value);
                    setNewDateShareUser('');
                    setNewDateShareContact('');
                  }}
                >
                  <option value="none">Do not link (Personal Date)</option>
                  <option value="user">Another User (Household Member)</option>
                  <option value="contact">A Contact (External Connection)</option>
                </select>
              </div>

              {newDateShareType === 'user' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="new-date-share-user">Select User *</label>
                  <select 
                    id="new-date-share-user"
                    className="input-control" 
                    value={newDateShareUser}
                    onChange={(e) => setNewDateShareUser(e.target.value)}
                    required
                  >
                    <option value="">-- Choose User --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                    ))}
                  </select>
                </div>
              )}

              {newDateShareType === 'contact' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="new-date-share-contact">Select Contact *</label>
                  <select 
                    id="new-date-share-contact"
                    className="input-control" 
                    value={newDateShareContact}
                    onChange={(e) => setNewDateShareContact(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Contact --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ gap: '0.375rem' }}>
                <Plus size={16} /> Add Date
              </button>
            </div>
          </form>

          {/* List of dates */}
          {loadingDates ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading dates...</p>
          ) : importantDates.length === 0 ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>No important dates registered yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Linked With</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importantDates.map(date => (
                    <tr key={date.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>{date.name}</td>
                      <td style={{ padding: '0.5rem' }}>{date.date}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className="badge" style={{ backgroundColor: date.shared_with_type !== 'none' ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)' }}>
                          {getSharedName(date)}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteImportantDate(date.id)}
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem', minWidth: 'auto', border: 'none', color: 'var(--destructive)' }}
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PASSWORD RESET CARD (LOCAL USERS ONLY) */}
        {currentUser?.auth_provider === 'local' && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              <Lock size={18} /> Reset Your Password
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem' }}>
              Change the password you use to log in to the application.
            </p>
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="profile-current-password">Current Password *</label>
                <input 
                  id="profile-current-password"
                  type="password" 
                  className="input-control" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="profile-new-password">New Password *</label>
                  <input 
                    id="profile-new-password"
                    type="password" 
                    className="input-control" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="profile-confirm-password">Confirm New Password *</label>
                  <input 
                    id="profile-confirm-password"
                    type="password" 
                    className="input-control" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ gap: '0.5rem' }}
                  disabled={savingPassword}
                >
                  <Lock size={16} /> {savingPassword ? 'Updating Password...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Unsplash Search Modal */}
        {isUnsplashModalOpen && (
          <div className="modal-overlay" onClick={() => setIsUnsplashModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
                  <Palette size={18} /> Search Unsplash Wallpapers
                </h3>
                <button className="close-btn" onClick={() => setIsUnsplashModalOpen(false)} style={{ fontSize: '1.5rem' }}>×</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <form onSubmit={handleSearchUnsplash} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input-control" 
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    placeholder="Enter keywords e.g. mountains, abstract, texture..."
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={searchingUnsplash}>
                    {searchingUnsplash ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {searchingUnsplash ? (
                  <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="spinner"></div>
                  </div>
                ) : unsplashResults.length > 0 ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                    gap: '0.75rem', 
                    maxHeight: '380px', 
                    overflowY: 'auto',
                    paddingRight: '0.25rem'
                  }}>
                    {unsplashResults.map((img) => (
                      <div 
                        key={img.id}
                        onClick={() => handleSelectUnsplashImage(img.urls.regular)}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          aspectRatio: '4/3',
                          border: '1px solid var(--border)',
                          transition: 'transform 0.15s ease'
                        }}
                        className="hover-lift"
                      >
                        <img 
                          src={img.urls.thumb} 
                          alt="Unsplash Selection" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.625rem',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          by {img.user.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Search for gorgeous background photos to dress up your navigation panel!
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <button className="btn btn-outline" onClick={() => setIsUnsplashModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// --- THEME COLOR EXTRACTION ENGINE ---
function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';

  const normalize = (val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const R = normalize(r);
  const G = normalize(g);
  const B = normalize(b);

  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return luminance > 0.179 ? '#09090b' : '#ffffff';
}

function extractColorFromImage(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 30;
  canvas.height = 30;
  ctx.drawImage(imageElement, 0, 0, 30, 30);
  
  const imgData = ctx.getImageData(0, 0, 30, 30).data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  let maxVibrancy = -1;
  let bestColor = { r: 63, g: 81, b: 181 };
  
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i+1];
    const b = imgData[i+2];
    const a = imgData[i+3];
    
    if (a < 150) continue;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    const saturation = max === 0 ? 0 : delta / max;
    const brightness = max / 255;
    const vibrancy = saturation * brightness;
    
    rSum += r;
    gSum += g;
    bSum += b;
    count++;
    
    if (vibrancy > maxVibrancy && brightness > 0.2 && brightness < 0.8 && saturation > 0.15) {
      maxVibrancy = vibrancy;
      bestColor = { r, g, b };
    }
  }
  
  if (count > 0 && maxVibrancy > 0.05) {
    return rgbToHex(bestColor.r, bestColor.g, bestColor.b);
  } else if (count > 0) {
    const rAvg = Math.round(rSum / count);
    const gAvg = Math.round(gSum / count);
    const bAvg = Math.round(bSum / count);
    return rgbToHex(rAvg, gAvg, bAvg);
  }
  return '#3f51b5';
}
