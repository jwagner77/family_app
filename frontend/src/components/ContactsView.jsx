import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Mail, Calendar, Heart, MessageSquare, Trash2, Edit2, Check, X, ShieldAlert, Shield, Plus } from 'lucide-react';

const RELATIONSHIP_OPTIONS = ['Family', 'Friend', 'Work', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

const COMMON_CONNECTION_ROLES = [
  'Spouse', 'Husband', 'Wife', 'Partner',
  'Son', 'Daughter', 'Child',
  'Father', 'Mother', 'Parent',
  'Brother', 'Sister', 'Sibling',
  'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
  'Uncle', 'Aunt', 'Nephew', 'Niece',
  'Cousin', 'Friend', 'In-Law'
];

const RECIPROCAL_MAP = {
  'spouse': 'Spouse',
  'husband': 'Wife',
  'wife': 'Husband',
  'partner': 'Partner',
  'fiancé': 'Fiancée',
  'fiancée': 'Fiancé',
  'significant other': 'Significant Other',
  
  'son': 'Father',
  'daughter': 'Father',
  'child': 'Parent',
  'kid': 'Parent',
  
  'father': 'Child',
  'dad': 'Child',
  'mother': 'Child',
  'mom': 'Child',
  'parent': 'Child',
  
  'brother': 'Brother',
  'sister': 'Brother',
  'sibling': 'Sibling',
  
  'grandfather': 'Grandchild',
  'grandpa': 'Grandchild',
  'grandmother': 'Grandchild',
  'grandma': 'Grandchild',
  'grandparent': 'Grandchild',
  'grandson': 'Grandparent',
  'granddaughter': 'Grandparent',
  'grandchild': 'Grandparent',
  
  'uncle': 'Nephew',
  'aunt': 'Nephew',
  'nephew': 'Uncle',
  'niece': 'Uncle',
  
  'cousin': 'Cousin',
  'friend': 'Friend',
  'colleague': 'Colleague',
  'coworker': 'Coworker',
  'roommate': 'Roommate',
  'boyfriend': 'Girlfriend',
  'girlfriend': 'Boyfriend',
  
  'stepfather': 'Stepchild',
  'stepmother': 'Stepchild',
  'stepson': 'Step-parent',
  'stepdaughter': 'Step-parent',
  'stepchild': 'Step-parent'
};

function getReciprocalRole(role) {
  if (!role) return '';
  const r = role.trim().toLowerCase();
  return RECIPROCAL_MAP[r] || role;
}

export default function ContactsView({ showToast }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Relationships & Users States
  const [relationships, setRelationships] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [newRelType, setNewRelType] = useState('');
  const [newReciprocalType, setNewReciprocalType] = useState('');
  const [newRelTargetType, setNewRelTargetType] = useState('contact');
  const [newRelTargetId, setNewRelTargetId] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedContact, setSelectedContact] = useState(null);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [notes, setNotes] = useState('');
  const [newDateName, setNewDateName] = useState('');
  const [newDateValue, setNewDateValue] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchRelationships();
    fetchUsersList();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'contacts') {
        handleOpenAddModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      } else {
        showToast('Failed to fetch contacts', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async () => {
    try {
      const res = await fetch('/api/relationships');
      if (res.ok) {
        const data = await res.json();
        setRelationships(data);
      }
    } catch (err) {
      console.error('Error fetching relationships:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users/assignable');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching users list:', err);
    }
  };

  const getContactRelationships = (contact) => {
    if (!contact) return [];
    
    const relMap = new Map();
    
    // 1. Outgoing direct relationships from this contact or user
    relationships.forEach(rel => {
      const isFromContact = rel.from_person_type === 'contact' && rel.from_person_id === contact.id;
      const isFromUser = contact.user_id && rel.from_person_type === 'user' && rel.from_person_id === contact.user_id;
      
      if (isFromContact || isFromUser) {
        const targetKey = `${rel.to_person_type}_${rel.to_person_id}`;
        const otherName = getPersonName(rel.to_person_type, rel.to_person_id);
        relMap.set(targetKey, {
          id: rel.id,
          otherName,
          otherType: rel.to_person_type,
          otherId: rel.to_person_id,
          relationshipType: rel.relationship_type,
          isDirect: true
        });
      }
    });

    // 2. Incoming relationships to this contact or user (if not already mapped by a direct edge)
    relationships.forEach(rel => {
      const isToContact = rel.to_person_type === 'contact' && rel.to_person_id === contact.id;
      const isToUser = contact.user_id && rel.to_person_type === 'user' && rel.to_person_id === contact.user_id;
      
      if (isToContact || isToUser) {
        const sourceKey = `${rel.from_person_type}_${rel.from_person_id}`;
        if (!relMap.has(sourceKey)) {
          const otherName = getPersonName(rel.from_person_type, rel.from_person_id);
          const reciprocalRole = getReciprocalRole(rel.relationship_type);
          relMap.set(sourceKey, {
            id: rel.id,
            otherName,
            otherType: rel.from_person_type,
            otherId: rel.from_person_id,
            relationshipType: reciprocalRole,
            isDirect: false
          });
        }
      }
    });

    return Array.from(relMap.values());
  };

  const getPersonName = (type, id) => {
    if (type === 'contact') {
      const found = contacts.find(c => c.id === id);
      return found ? found.name : `Contact #${id}`;
    } else if (type === 'user') {
      const found = usersList.find(u => u.id === id);
      return found ? (found.display_name || found.username) : `User #${id}`;
    }
    return 'Unknown';
  };

  const handleDeleteRelationship = async (id) => {
    if (!window.confirm('Are you sure you want to delete this relationship?')) return;
    try {
      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Relationship deleted successfully', 'success');
        fetchRelationships();
      } else {
        showToast('Failed to delete relationship', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting relationship', 'error');
    }
  };

  const handleRelTypeChange = (val) => {
    setNewRelType(val);
    setNewReciprocalType(getReciprocalRole(val));
  };

  const handleAddRelationship = async () => {
    if (!newRelType.trim() || !newRelTargetId) {
      showToast('Please specify a relationship type and target person', 'error');
      return;
    }

    try {
      const payload = {
        from_person_type: 'contact',
        from_person_id: selectedContact.id,
        to_person_type: newRelTargetType,
        to_person_id: parseInt(newRelTargetId),
        relationship_type: newRelType.trim(),
        reciprocal_type: newReciprocalType.trim() || getReciprocalRole(newRelType.trim())
      };

      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Relationship added successfully!', 'success');
        setNewRelType('');
        setNewReciprocalType('');
        setNewRelTargetId('');
        fetchRelationships();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add relationship', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding relationship', 'error');
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedContact(null);
    setName('');
    setPhone('');
    setEmail('');
    setBirthday('');
    setRelationship('Family');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contact) => {
    setModalMode('edit');
    setSelectedContact(contact);
    setName(contact.name || '');
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setBirthday(contact.birthday || '');
    setRelationship(contact.relationship || 'Family');
    setNotes(contact.notes || '');
    setIsModalOpen(true);
  };

  const handleAddImportantDate = async () => {
    if (!newDateName.trim() || !newDateValue) {
      showToast('Please enter both event name and date', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/important-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDateName.trim(), date: newDateValue })
      });
      if (res.ok) {
        const added = await res.json();
        showToast('Important date added!', 'success');
        
        // Update local contacts list state so it renders instantly
        const updatedContacts = contacts.map(c => {
          if (c.id === selectedContact.id) {
            return {
              ...c,
              important_dates: [...(c.important_dates || []), added]
            };
          }
          return c;
        });
        setContacts(updatedContacts);
        
        // Also update selectedContact so the modal updates its list
        setSelectedContact(prev => ({
          ...prev,
          important_dates: [...(prev.important_dates || []), added]
        }));
        
        setNewDateName('');
        setNewDateValue('');
      } else {
        showToast('Failed to add important date', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding important date', 'error');
    }
  };

  const handleDeleteImportantDate = async (dateId) => {
    try {
      const res = await fetch(`/api/contacts/important-dates/${dateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Important date deleted', 'success');
        
        // Update local contacts state
        const updatedContacts = contacts.map(c => {
          if (c.id === selectedContact.id) {
            return {
              ...c,
              important_dates: (c.important_dates || []).filter(d => d.id !== dateId)
            };
          }
          return c;
        });
        setContacts(updatedContacts);
        
        // Update selectedContact
        setSelectedContact(prev => ({
          ...prev,
          important_dates: (prev.important_dates || []).filter(d => d.id !== dateId)
        }));
      } else {
        showToast('Failed to delete important date', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting important date', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    const payload = { name, phone, email, birthday, relationship, notes };

    try {
      let res;
      if (modalMode === 'add') {
        res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/contacts/${selectedContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(modalMode === 'add' ? 'Contact added successfully!' : 'Contact updated successfully!', 'success');
        setIsModalOpen(false);
        fetchContacts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save contact', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving contact', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Contact deleted successfully!', 'success');
        fetchContacts();
      } else {
        showToast('Failed to delete contact', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting contact', 'error');
    }
  };

  const handleExportContacts = (contactsToExport) => {
    if (contactsToExport.length === 0) {
      showToast('No contacts selected for export', 'error');
      return;
    }
    
    let vcfContent = '';
    contactsToExport.forEach(c => {
      vcfContent += 'BEGIN:VCARD\r\n';
      vcfContent += 'VERSION:3.0\r\n';
      vcfContent += `FN:${c.name}\r\n`;
      
      const nameParts = c.name.trim().split(' ');
      if (nameParts.length > 1) {
        const first = nameParts[0];
        const last = nameParts.slice(1).join(' ');
        vcfContent += `N:${last};${first};;;\r\n`;
      } else {
        vcfContent += `N:;${c.name};;;\r\n`;
      }
      
      if (c.phone) {
        vcfContent += `TEL;TYPE=CELL:${c.phone}\r\n`;
      }
      if (c.email) {
        vcfContent += `EMAIL;TYPE=INTERNET:${c.email}\r\n`;
      }
      if (c.birthday) {
        vcfContent += `BDAY:${c.birthday}\r\n`;
      }
      if (c.notes) {
        const escapedNotes = c.notes.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
        vcfContent += `NOTE:${escapedNotes}\r\n`;
      }
      vcfContent += 'END:VCARD\r\n';
    });

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = contactsToExport.length === 1 
      ? `${contactsToExport[0].name.replace(/\s+/g, '_')}.vcf`
      : `Family_Contacts_Export.vcf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Successfully exported ${contactsToExport.length} contact(s) to vCard!`, 'success');
  };

  // Generate dynamic gradients based on name letters for beautiful initials avatars
  const getAvatarGradient = (contactName) => {
    const charCodeSum = contactName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = charCodeSum % 6;
    const gradients = [
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(135deg, #a6c0fe 0%, #f1eef8 100%)',
      'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)'
    ];
    return gradients[index];
  };

  const getInitials = (contactName) => {
    const parts = contactName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return contactName.substring(0, 2).toUpperCase();
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRelation = relationshipFilter === 'All' || c.relationship === relationshipFilter;
    return matchesSearch && matchesRelation;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Page Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', width: '100%' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
          Contacts
        </h2>
      </div>

      {/* Controls & Search bar */}
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="input-control"
              placeholder="Search contacts by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', width: '100%' }}
            />
          </div>
          <select
            className="input-control"
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value)}
            style={{ width: '130px', flexShrink: 0 }}
          >
            <option value="All">All Relations</option>
            {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button"
            className="btn btn-outline"
            onClick={() => {
              const allFilteredIds = filteredContacts.map(c => c.id);
              if (selectedContactIds.length > 0) {
                setSelectedContactIds([]);
              } else {
                setSelectedContactIds(allFilteredIds);
              }
            }}
            style={{ fontSize: '0.8125rem', height: '38px', padding: '0 0.75rem' }}
          >
            {selectedContactIds.length > 0 ? 'Clear Selection' : 'Select Contacts'}
          </button>
        </div>
      </div>

      {selectedContactIds.length > 0 && (
        <div className="card animate-fade-in" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent)', borderLeft: '4px solid var(--primary)', marginTop: '-0.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
            Selected {selectedContactIds.length} contact{selectedContactIds.length === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const selected = contacts.filter(c => selectedContactIds.includes(c.id));
                handleExportContacts(selected);
              }}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto' }}
            >
              Export Selected ({selectedContactIds.length})
            </button>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const allFilteredIds = filteredContacts.map(c => c.id);
                const allSelected = allFilteredIds.every(id => selectedContactIds.includes(id));
                if (allSelected) {
                  setSelectedContactIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                } else {
                  setSelectedContactIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                }
              }}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto', background: 'var(--card)' }}
            >
              {filteredContacts.map(c => c.id).every(id => selectedContactIds.includes(id)) ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => setSelectedContactIds([])}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto', background: 'var(--card)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid listing */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : filteredContacts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredContacts.map(contact => (
            <div key={contact.id} className="card hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
              
              {/* Selection Checkbox */}
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                <input 
                  type="checkbox"
                  checked={selectedContactIds.includes(contact.id)}
                  onChange={() => {
                    if (selectedContactIds.includes(contact.id)) {
                      setSelectedContactIds(prev => prev.filter(id => id !== contact.id));
                    } else {
                      setSelectedContactIds(prev => [...prev, contact.id]);
                    }
                  }}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              {/* Top Section: Avatar + Name + Relationship Tag */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: getAvatarGradient(contact.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  color: '#2c3e50',
                  textShadow: '0 1px 1px rgba(255,255,255,0.4)',
                  flexShrink: 0
                }}>
                  {getInitials(contact.name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contact.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '20px',
                      background: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                      fontWeight: 'bold'
                    }}>
                      {contact.relationship}
                    </span>
                    {contact.user_id && (
                      <span style={{
                        fontSize: '0.6875rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '20px',
                        background: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Shield size={10} /> Household User
                      </span>
                    )}
                    {contact.game_wins > 0 && (
                      <span style={{
                        fontSize: '0.6875rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '20px',
                        background: '#f59e0b',
                        color: '#fff',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }} title={`${contact.game_wins} Game Wins`}>
                        🏆 {contact.game_wins} {contact.game_wins === 1 ? 'Win' : 'Wins'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <hr style={{ margin: '0.5rem 0', border: 0, borderTop: '1px solid var(--border)' }} />

              {/* Middle Section: Phone, Email, Birthday */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={13} style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={13} style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</span>
                  </div>
                )}
                {contact.birthday && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={13} style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{contact.birthday}</span>
                  </div>
                )}
                {contact.important_dates && contact.important_dates.length > 0 && (
                  contact.important_dates.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>
                        <strong>{d.name}:</strong> {d.date}
                      </span>
                    </div>
                  ))
                )}
                {contact.notes && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <MessageSquare size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{contact.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Relationships Section */}
              {getContactRelationships(contact).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Relationships:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {getContactRelationships(contact).map(rel => (
                      <div key={`${rel.id}_${rel.otherType}_${rel.otherId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', background: 'var(--accent)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <span>
                          <span style={{ fontWeight: '500' }}>{rel.otherName}</span> <span style={{ color: 'var(--muted-foreground)' }}>-</span> <strong style={{ color: 'var(--primary)' }}>{rel.relationshipType}</strong>
                        </span>
                        <button 
                          onClick={() => handleDeleteRelationship(rel.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                          title="Delete relationship"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                <button
                  className="btn btn-outline"
                  style={{ minWidth: 'auto', padding: '0.35rem 0.5rem', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }}
                  onClick={() => handleExportContacts([contact])}
                >
                  Export
                </button>
                <button
                  className="btn btn-outline"
                  style={{ minWidth: 'auto', padding: '0.35rem 0.5rem', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }}
                  onClick={() => handleOpenEditModal(contact)}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  className="btn btn-danger"
                  style={{ minWidth: 'auto', padding: '0.35rem 0.5rem', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }}
                  onClick={() => handleDelete(contact.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <p style={{ margin: 0 }}>No contacts found matching your filters. Create a new contact to get started!</p>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'Add Contact' : 'Edit Contact'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="contact-name">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="contact-name"
                    type="text"
                    className="input-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-relationship">Relationship</label>
                  <select
                    id="contact-relationship"
                    className="input-control"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  >
                    {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="contact-phone">Phone</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      className="input-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 555-0199"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-birthday">Birthday</label>
                    <input
                      id="contact-birthday"
                      type="date"
                      className="input-control"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="input-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-notes">Notes</label>
                  <textarea
                    id="contact-notes"
                    className="input-control"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes, references, key details..."
                  />
                </div>

                {modalMode === 'edit' && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Heart size={14} style={{ color: 'var(--primary)' }} /> Manage Relationships
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
                      Define relationships between this contact and other family contacts or household users.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-rel-target-type" style={{ fontSize: '0.6875rem' }}>Target Person Type</label>
                        <select 
                          id="new-rel-target-type"
                          className="input-control"
                          value={newRelTargetType}
                          onChange={(e) => {
                            setNewRelTargetType(e.target.value);
                            setNewRelTargetId('');
                          }}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        >
                          <option value="contact">Contact</option>
                          <option value="user">User</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-rel-target" style={{ fontSize: '0.6875rem' }}>Select Target Person *</label>
                        <select 
                          id="new-rel-target"
                          className="input-control"
                          value={newRelTargetId}
                          onChange={(e) => setNewRelTargetId(e.target.value)}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        >
                          <option value="">-- Choose Person --</option>
                          {newRelTargetType === 'contact' ? (
                            contacts.filter(c => c.id !== selectedContact?.id).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))
                          ) : (
                            usersList.map(u => (
                              <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-rel-type" style={{ fontSize: '0.6875rem' }}>Relationship (Target is my)</label>
                        <input 
                          id="new-rel-type"
                          type="text" 
                          list="connection-role-suggestions"
                          className="input-control" 
                          placeholder="e.g. Spouse, Son" 
                          value={newRelType}
                          onChange={(e) => handleRelTypeChange(e.target.value)}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        />
                        <datalist id="connection-role-suggestions">
                          {COMMON_CONNECTION_ROLES.map(role => (
                            <option key={role} value={role} />
                          ))}
                        </datalist>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-reciprocal-type" style={{ fontSize: '0.6875rem' }}>Reciprocal (I am their)</label>
                        <input 
                          id="new-reciprocal-type"
                          type="text" 
                          list="connection-role-suggestions"
                          className="input-control" 
                          placeholder="e.g. Spouse, Father" 
                          value={newReciprocalType}
                          onChange={(e) => setNewReciprocalType(e.target.value)}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={handleAddRelationship}
                      style={{ fontSize: '0.75rem', gap: '0.25rem', padding: '0.45rem', alignSelf: 'flex-start' }}
                    >
                      <Plus size={12} /> Add Relationship
                    </button>

                    {/* List of current relationships for this contact */}
                    {selectedContact && getContactRelationships(selectedContact).length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Current Relationships:</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {getContactRelationships(selectedContact).map(rel => (
                            <div key={`${rel.id}_${rel.otherType}_${rel.otherId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', background: 'var(--muted)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                              <span>
                                <strong style={{ color: 'var(--foreground)' }}>{rel.otherName}</strong> <span style={{ color: 'var(--muted-foreground)' }}>-</span> <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{rel.relationshipType}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteRelationship(rel.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                title="Delete relationship"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {modalMode === 'edit' && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Calendar size={14} style={{ color: 'var(--primary)' }} /> Manage Important Dates
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
                      Record additional dates such as Anniversaries, Graduations, or special landmarks.
                    </p>
                    
                    {/* Add date form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.6875rem' }}>Event Name</label>
                        <input 
                          type="text" 
                          className="input-control" 
                          placeholder="e.g. Anniversary" 
                          value={newDateName} 
                          onChange={(e) => setNewDateName(e.target.value)}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.6875rem' }}>Date</label>
                        <input 
                          type="date" 
                          className="input-control" 
                          value={newDateValue} 
                          onChange={(e) => setNewDateValue(e.target.value)}
                          style={{ height: '32px', fontSize: '0.75rem' }}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={handleAddImportantDate}
                        style={{ height: '32px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    {/* Dates list */}
                    {selectedContact?.important_dates && selectedContact.important_dates.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                        {selectedContact.important_dates.map(d => (
                          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', background: 'var(--accent)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <span><strong>{d.name}:</strong> {d.date}</span>
                            <button 
                              type="button"
                              onClick={() => handleDeleteImportantDate(d.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                              title="Delete date"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ gap: '0.25rem' }}>
                    <Check size={16} /> Save Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
