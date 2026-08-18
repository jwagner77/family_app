import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  RefreshCw, 
  Trash2, 
  CheckSquare, 
  Info,
  Layers
} from 'lucide-react';

export default function CalendarView({ showToast, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bills, setBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Label Colors
  const [eventColor, setEventColor] = useState('#3b82f6');
  const [taskColor, setTaskColor] = useState('#10b981');
  const [billColor, setBillColor] = useState('#ef4444');
  const [subColor, setSubColor] = useState('#8b5cf6');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedDateStr, setSelectedDateStr] = useState('');
  
  // Event Form states
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchTasks();
    fetchBills();
    fetchSubscriptions();
    fetchCalendarSettings();
  }, [currentDate]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'calendar') {
        openCreateModal(new Date().toLocaleDateString('sv'));
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/focusflow/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.filter(t => t.due_date));
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  };

  const fetchCalendarSettings = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        if (data.calendar_event_color) setEventColor(data.calendar_event_color);
        if (data.calendar_task_color) setTaskColor(data.calendar_task_color);
        if (data.calendar_bill_color) setBillColor(data.calendar_bill_color);
        if (data.calendar_sub_color) setSubColor(data.calendar_sub_color);
      }
    } catch (err) {
      console.error('Error fetching calendar color settings:', err);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/todo/sync', {
        method: 'POST'
      });
      if (res.ok) {
        await fetchEvents();
        await fetchTasks();
        showToast('Calendar synced with Microsoft 365!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to sync. Ensure Microsoft OAuth is completed.', 'error');
      }
    } catch (err) {
      showToast('Error syncing calendar.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const openCreateModal = (dateStr) => {
    setModalMode('create');
    setSelectedDateStr(dateStr);
    setEventTitle('');
    setEventDesc('');
    setEventStartTime(`${dateStr}T09:00`);
    setEventEndTime(`${dateStr}T10:00`);
    setEventLocation('');
    setIsModalOpen(true);
  };

  const openEditModal = (event, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setSelectedEventId(event.id);
    setEventTitle(event.title);
    setEventDesc(event.description || '');
    setEventStartTime(event.start_time.substring(0, 16));
    setEventEndTime(event.end_time.substring(0, 16));
    setEventLocation(event.location || '');
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStartTime || !eventEndTime) return;

    const body = {
      title: eventTitle,
      description: eventDesc,
      start_time: eventStartTime,
      end_time: eventEndTime,
      location: eventLocation
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/calendar/events/${selectedEventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
        showToast(modalMode === 'create' ? 'Event created!' : 'Event updated!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save event', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this calendar event?')) return;

    try {
      const res = await fetch(`/api/calendar/events/${selectedEventId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
        showToast('Event deleted.', 'success');
      }
    } catch (err) {
      showToast('Failed to delete event.', 'error');
    }
  };

  // Calendar generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const prevMonthNumDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysArr = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthNumDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArr.push({ day: d, isCurrentMonth: false, dateStr });
  }

  // Current month days
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArr.push({ day: d, isCurrentMonth: true, dateStr });
  }

  // Next month padding days
  const totalCells = 42; // 6 rows of 7 days
  const nextMonthPadding = totalCells - daysArr.length;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArr.push({ day: d, isCurrentMonth: false, dateStr });
  }

  // Helper to calculate all YYYY-MM-DD dates that an event spans
  const getDatesSpanned = (startStr, endStr) => {
    if (!startStr || !endStr) return [];
    const startDateOnly = startStr.split('T')[0];
    const endDateOnly = endStr.split('T')[0];
    
    if (startDateOnly === endDateOnly) {
      return [startDateOnly];
    }
    
    const start = new Date(startStr);
    let end = new Date(endStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [startDateOnly];
    }
    
    // Adjust end date if it is exactly midnight to handle all-day events correctly (e.g. 2026-06-23T00:00 to 2026-06-24T00:00 should only show on the 23rd)
    const endHours = end.getHours();
    const endMinutes = end.getMinutes();
    const endSeconds = end.getSeconds();
    const endMs = end.getMilliseconds();
    if (endHours === 0 && endMinutes === 0 && endSeconds === 0 && endMs === 0) {
      end = new Date(end.getTime() - 1000);
    }
    
    const dates = [];
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endCompare = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    while (current <= endCompare) {
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, '0');
      const dayStr = String(current.getDate()).padStart(2, '0');
      dates.push(`${yearStr}-${monthStr}-${dayStr}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Group events, tasks, bills, and subscriptions by date
  const eventsByDate = {};
  events.forEach(e => {
    const dates = getDatesSpanned(e.start_time, e.end_time);
    dates.forEach(datePart => {
      if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
      eventsByDate[datePart].push({ ...e, calendar_type: 'event' });
    });
  });

  tasks.forEach(t => {
    const datePart = t.due_date;
    if (datePart) {
      if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
      eventsByDate[datePart].push({ ...t, calendar_type: 'task' });
    }
  });

  bills.forEach(b => {
    const datePart = b.due_date;
    if (datePart) {
      if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
      eventsByDate[datePart].push({ ...b, calendar_type: 'bill' });
    }
  });

  subscriptions.forEach(s => {
    const datePart = s.next_billing_date;
    if (datePart) {
      if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
      eventsByDate[datePart].push({ ...s, calendar_type: 'subscription' });
    }
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Page Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', width: '100%' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
          Calendar
        </h2>
      </div>
      {/* Calendar Header Panel */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, minWidth: '200px' }}>
            {monthNames[month]} {year}
          </h2>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.5rem' }} onClick={handlePrevMonth} title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.5rem' }} onClick={() => setCurrentDate(new Date())} title="Today">
              Today
            </button>
            <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.5rem' }} onClick={handleNextMonth} title="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: eventColor }} /> Events
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: taskColor }} /> Tasks
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: billColor }} /> Bills
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: subColor }} /> Subscriptions
            </span>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleSyncCalendar} 
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Calendar'}
          </button>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        
        {/* Days of Week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, 1fr)', flex: 1, borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
          {daysArr.map((cell, idx) => {
            const dateEvents = eventsByDate[cell.dateStr] || [];
            const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;

            return (
              <div 
                key={idx} 
                onClick={() => openCreateModal(cell.dateStr)}
                style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  borderLeft: '1px solid var(--border-color)', 
                  padding: '0.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  background: cell.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-main)',
                  opacity: cell.isCurrentMonth ? 1 : 0.5,
                  cursor: 'pointer',
                  position: 'relative'
                }}
                className="hover-lift"
              >
                {/* Day Number */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  background: isToday ? 'var(--primary)' : 'transparent',
                  color: isToday ? '#ffffff' : 'var(--text-main)'
                }}>
                  {cell.day}
                </div>

                {/* Day Events listing */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                  {dateEvents.slice(0, 4).map((item, i) => {
                    const isEvent = item.calendar_type === 'event';
                    const isTask = item.calendar_type === 'task';
                    const isBill = item.calendar_type === 'bill';
                    const isSub = item.calendar_type === 'subscription';

                    let colorVal = eventColor;
                    let titleText = item.title;
                    if (isTask) {
                      colorVal = taskColor;
                    } else if (isBill) {
                      colorVal = billColor;
                      titleText = `💵 Bill: ${item.name} ($${item.amount})`;
                    } else if (isSub) {
                      colorVal = subColor;
                      titleText = `💳 Sub: ${item.name} ($${item.cost})`;
                    }

                    const bgVal = colorVal + '1f'; // approx 12% opacity hex suffix

                    return (
                      <div 
                        key={i}
                        onClick={isEvent ? (e) => openEditModal(item, e) : (e) => e.stopPropagation()}
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '6px',
                          background: bgVal,
                          color: colorVal,
                          borderLeft: `3px solid ${colorVal}`,
                          fontWeight: '600',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={titleText}
                      >
                        {titleText}
                      </div>
                    );
                  })}
                  {dateEvents.length > 4 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '700' }}>
                      +{dateEvents.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Dialog for Create/Edit Calendar Event */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                {modalMode === 'create' ? 'Create Calendar Event' : 'Event Details'}
              </h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveEvent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Event Subject / Title</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Family Dinner" 
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: 0 }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                    <label><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Start Time</label>
                    <input 
                      type="datetime-local" 
                      className="input-control" 
                      value={eventStartTime}
                      onChange={e => setEventStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                    <label><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> End Time</label>
                    <input 
                      type="datetime-local" 
                      className="input-control" 
                      value={eventEndTime}
                      onChange={e => setEventEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Location</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Dining Room, or Online" 
                    value={eventLocation}
                    onChange={e => setEventLocation(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Description / Notes</label>
                  <textarea 
                    className="input-control" 
                    value={eventDesc}
                    onChange={e => setEventDesc(e.target.value)}
                    rows={2}
                    placeholder="Add notes..."
                    style={{ resize: 'none', minHeight: '70px' }}
                  />
                </div>

                {currentUser.calendar_guid && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-main)', padding: '0.5rem 0.75rem', borderRadius: '12px' }}>
                    <Info size={14} style={{ color: 'var(--primary)' }} />
                    <span>Events created here will sync to your Microsoft Calendar.</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
                  {modalMode === 'edit' ? (
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={handleDeleteEvent}
                    >
                      <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Delete
                    </button>
                  ) : <div />}
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Event</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
