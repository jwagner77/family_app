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
  Users
} from 'lucide-react';

export default function UserProfileView({ showToast, currentUser, onProfileUpdate }) {
  // Profile fields state
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [birthday, setBirthday] = useState(currentUser?.birthday || '');
  const [pictureUrl, setPictureUrl] = useState(currentUser?.picture_url || '');

  // Move General Settings state
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'US/New_York');
  const [primaryColor, setPrimaryColor] = useState(currentUser?.primary_color || '#3f51b5');
  const [theme, setTheme] = useState(currentUser?.theme || 'system');
  const [savingProfile, setSavingProfile] = useState(false);

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

  // Helper to expand and format accent color for HTML color picker
  const getValidColorPickerValue = (colorStr) => {
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
  };

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Validate primary color hex if manual
      let validatedColor = primaryColor.trim();
      if (validatedColor && !validatedColor.startsWith('#')) {
        validatedColor = '#' + validatedColor;
      }
      if (validatedColor && !/^#[0-9A-Fa-f]{6}$/.test(validatedColor) && !/^#[0-9A-Fa-f]{3}$/.test(validatedColor)) {
        throw new Error('Invalid Hex Accent Color code.');
      }

      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          phone: phone,
          email: email,
          birthday: birthday,
          picture_url: pictureUrl,
          timezone: timezone,
          primary_color: validatedColor,
          theme: theme
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      // Update parent application color theme immediately
      if (validatedColor) {
        document.documentElement.style.setProperty('--primary', validatedColor);
      }
      
      showToast('Profile updated successfully!');
      if (onProfileUpdate && data.user) {
        onProfileUpdate(data.user);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
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
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
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
                  onChange={(e) => setBirthday(e.target.value)}
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
                  onChange={(e) => setTimezone(e.target.value)}
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
                    onChange={(e) => setPrimaryColor(e.target.value)}
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
                    onChange={(e) => setPrimaryColor(e.target.value)}
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
                  onClick={() => setTheme('system')}
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
                  onClick={() => setTheme('light')}
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
                  onClick={() => setTheme('dark')}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={savingProfile}
              >
                <Save size={16} /> {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
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

      </div>
    </div>
  );
}
