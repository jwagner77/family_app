import React, { useState, useEffect } from 'react';
import { Gift, Calendar, Search, Sparkles, ChevronRight, UserPlus, Info } from 'lucide-react';

export default function BirthdaysView({ showToast }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading birthdays', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getBirthdayDetails = (birthdateStr) => {
    if (!birthdateStr) return null;
    const parts = birthdateStr.split('-');
    if (parts.length !== 3) return null;

    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Next birthday calculation
    let nextBday = new Date(today.getFullYear(), birthMonth, birthDay);
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = nextBday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate age turning
    const ageTurning = nextBday.getFullYear() - birthYear;

    return {
      daysRemaining: diffDays,
      ageTurning,
      formattedDate: nextBday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      originalDate: birthdateStr
    };
  };

  // Process contacts with birthdays
  const birthdayList = contacts
    .map(c => {
      const details = getBirthdayDetails(c.birthday);
      return details ? { ...c, birthdayDetails: details } : null;
    })
    .filter(c => c !== null && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.birthdayDetails.daysRemaining - b.birthdayDetails.daysRemaining);

  // Grouping
  const upcomingThisMonth = birthdayList.filter(c => c.birthdayDetails.daysRemaining <= 30);
  const futureBirthdays = birthdayList.filter(c => c.birthdayDetails.daysRemaining > 30);

  const getDaysMessage = (days) => {
    if (days === 365 || days === 0) return 'Today! 🎉';
    if (days === 1) return 'Tomorrow! ⏰';
    return `In ${days} days`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Page Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', width: '100%' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
          Birthdays
        </h2>
      </div>

      {/* Overview stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <Gift size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>This Month's Birthdays</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{upcomingThisMonth.length}</p>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Next Up</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {birthdayList.length > 0 ? `${birthdayList[0].name} (${getDaysMessage(birthdayList[0].birthdayDetails.daysRemaining)})` : 'No upcoming birthdays'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            className="input-control"
            placeholder="Search birthdays by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Birthday sections */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : birthdayList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Upcoming this month */}
          {upcomingThisMonth.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} style={{ color: '#f59e0b' }} /> Upcoming in next 30 days
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {upcomingThisMonth.map(contact => (
                  <div key={contact.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>{contact.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Turning <strong style={{ color: 'var(--text-main)' }}>{contact.birthdayDetails.ageTurning}</strong> on {contact.birthdayDetails.formattedDate}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '12px',
                      background: contact.birthdayDetails.daysRemaining <= 1 ? 'linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)' : 'rgba(239, 68, 68, 0.15)',
                      color: contact.birthdayDetails.daysRemaining <= 1 ? '#ffffff' : '#ef4444',
                      fontWeight: 'bold'
                    }}>
                      {getDaysMessage(contact.birthdayDetails.daysRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Future Birthdays */}
          {futureBirthdays.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem' }}>All Birthdays</h3>
              <div className="card" style={{ padding: 0 }}>
                {futureBirthdays.map((contact, index) => (
                  <div key={contact.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.5rem',
                    borderBottom: index < futureBirthdays.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{contact.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Turning {contact.birthdayDetails.ageTurning} on {contact.birthdayDetails.formattedDate}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {getDaysMessage(contact.birthdayDetails.daysRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <p style={{ margin: 0 }}>No birthdays found. Try adding a contact with a birthday in the Contacts page!</p>
        </div>
      )}

      {/* Note about adding birthdays */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 'auto' }}>
        <Info size={14} style={{ color: 'var(--primary)' }} />
        <span>Birthdays are synced directly from your list of Contacts. To add a new birthday, create a Contact card with a birthday date.</span>
      </div>

    </div>
  );
}
