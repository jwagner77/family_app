import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Mail, Calendar, Heart, MessageSquare, Trash2, Edit2, Check, X, ShieldAlert, Shield, Plus } from 'lucide-react';

const RELATIONSHIP_OPTIONS = ['Family', 'Friend', 'Work', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

export default function ContactsView({ showToast }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Relationships & Users States
  const [relationships, setRelationships] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [newRelType, setNewRelType] = useState('');
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
    return relationships.filter(rel => {
      const isFromContact = rel.from_person_type === 'contact' && rel.from_person_id === contact.id;
      const isToContact = rel.to_person_type === 'contact' && rel.to_person_id === contact.id;
      const isFromUser = contact.user_id && rel.from_person_type === 'user' && rel.from_person_id === contact.user_id;
      const isToUser = contact.user_id && rel.to_person_type === 'user' && rel.to_person_id === contact.user_id;
      return isFromContact || isToContact || isFromUser || isToUser;
    });
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
        relationship_type: newRelType.trim()
      };

      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Relationship added successfully!', 'success');
        setNewRelType('');
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

      </div>

      {/* Grid listing */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : filteredContacts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredContacts.map(contact => (
            <div key={contact.id} className="card hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
              
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
                    {getContactRelationships(contact).map(rel => {
                      const isSource = (rel.from_person_type === 'contact' && rel.from_person_id === contact.id) ||
                                       (contact.user_id && rel.from_person_type === 'user' && rel.from_person_id === contact.user_id);
                      
                      const otherType = isSource ? rel.to_person_type : rel.from_person_type;
                      const otherId = isSource ? rel.to_person_id : rel.from_person_id;
                      const otherName = getPersonName(otherType, otherId);
                      
                      return (
                        <div key={rel.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', background: 'var(--accent)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                          <span>
                            {isSource ? (
                              <><strong>{rel.relationship_type}</strong> of {otherName}</>
                            ) : (
                              <>{otherName}'s <strong>{rel.relationship_type}</strong></>
                            )}
                          </span>
                          <button 
                            onClick={() => handleDeleteRelationship(rel.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                            title="Delete relationship"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-rel-type" style={{ fontSize: '0.6875rem' }}>Connection Role</label>
                        <input 
                          id="new-rel-type"
                          type="text" 
                          className="input-control" 
                          placeholder="e.g. Spouse, Sibling" 
                          value={newRelType}
                          onChange={(e) => setNewRelType(e.target.value)}
                        />
                      </div>
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
                        >
                          <option value="contact">Contact</option>
                          <option value="user">User</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-rel-target" style={{ fontSize: '0.6875rem' }}>Select Target *</label>
                        <select 
                          id="new-rel-target"
                          className="input-control"
                          value={newRelTargetId}
                          onChange={(e) => setNewRelTargetId(e.target.value)}
                        >
                          <option value="">-- Choose --</option>
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
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={handleAddRelationship}
                      style={{ fontSize: '0.75rem', gap: '0.25rem', padding: '0.5rem' }}
                    >
                      <Plus size={12} /> Add Relationship
                    </button>
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
