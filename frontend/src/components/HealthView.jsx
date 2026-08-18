import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Moon, 
  Droplets, 
  Smile, 
  TrendingDown, 
  Clipboard, 
  Save, 
  Calendar as CalendarIcon, 
  Flame, 
  Heart, 
  HeartPulse, 
  Plus, 
  Edit2, 
  Trash2, 
  Pill, 
  Calendar, 
  AlertTriangle,
  Info,
  Clock,
  Check,
  X
} from 'lucide-react';

const MOODS = [
  { emoji: '😊', label: 'Great', color: '#10b981' },
  { emoji: '🙂', label: 'Good', color: '#3b82f6' },
  { emoji: '😐', label: 'Okay', color: '#8b5cf6' },
  { emoji: '😔', label: 'Tired', color: '#f59e0b' },
  { emoji: '😡', label: 'Stressed', color: '#ef4444' },
  { emoji: '🤒', label: 'Sick', color: '#6b7280' }
];

export default function HealthView({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('tracker'); // 'tracker', 'medications', 'appointments'

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('sv'); // 'YYYY-MM-DD'
  });

  // Current Log Form States
  const [steps, setSteps] = useState('');
  const [water, setWater] = useState('');
  const [sleep, setSleep] = useState('');
  const [mood, setMood] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  // History and Averages States
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Medications States
  const [medications, setMedications] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Daily');
  const [medTimeOfDay, setMedTimeOfDay] = useState('Morning');
  const [medNotes, setMedNotes] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [medModalMode, setMedModalMode] = useState('add');

  // Appointments States
  const [appointments, setAppointments] = useState([]);
  const [apptProvider, setApptProvider] = useState('');
  const [apptSpecialty, setApptSpecialty] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [selectedApptId, setSelectedApptId] = useState(null);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [apptModalMode, setApptModalMode] = useState('add');

  useEffect(() => {
    fetchHistory();
    fetchMedications();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'tracker') {
      window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { visible: false } }));
    } else if (activeSubTab === 'medications') {
      window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { label: 'Add Medication', visible: true } }));
    } else if (activeSubTab === 'appointments') {
      window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { label: 'Add Appointment', visible: true } }));
    }
  }, [activeSubTab]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'health') {
        if (activeSubTab === 'medications') {
          handleOpenAddMedModal();
        } else if (activeSubTab === 'appointments') {
          handleOpenAddApptModal();
        }
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, [activeSubTab]);

  useEffect(() => {
    // Load log for selected date if it exists
    const existingLog = history.find(h => h.log_date === selectedDate);
    if (existingLog) {
      setSteps(existingLog.steps !== null ? String(existingLog.steps) : '');
      setWater(existingLog.water_ml !== null ? String(existingLog.water_ml) : '');
      setSleep(existingLog.sleep_hours !== null ? String(existingLog.sleep_hours) : '');
      setMood(existingLog.mood || '');
      setWeight(existingLog.weight !== null ? String(existingLog.weight) : '');
      setNotes(existingLog.notes || '');
    } else {
      setSteps('');
      setWater('');
      setSleep('');
      setMood('');
      setWeight('');
      setNotes('');
    }
  }, [selectedDate, history]);

  // --- API LOGIC ---

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/health-logs');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const res = await fetch('/api/medications');
      if (res.ok) {
        const data = await res.json();
        setMedications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SAVING HEALTH LOGS ---
  const handleSaveLog = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      log_date: selectedDate,
      steps: steps !== '' ? Number(steps) : null,
      water_ml: water !== '' ? Number(water) : null,
      sleep_hours: sleep !== '' ? Number(sleep) : null,
      mood: mood || null,
      weight: weight !== '' ? Number(weight) : null,
      notes: notes || null
    };

    try {
      const res = await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Daily health log saved!', 'success');
        fetchHistory();
      } else {
        showToast('Failed to save health log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving log', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- MEDICATIONS CRUD ---
  const handleOpenAddMedModal = () => {
    setMedModalMode('add');
    setSelectedMedId(null);
    setMedName('');
    setMedDosage('');
    setMedFrequency('Daily');
    setMedTimeOfDay('Morning');
    setMedNotes('');
    setIsMedModalOpen(true);
  };

  const handleOpenEditMedModal = (med) => {
    setMedModalMode('edit');
    setSelectedMedId(med.id);
    setMedName(med.name || '');
    setMedDosage(med.dosage || '');
    setMedFrequency(med.frequency || 'Daily');
    setMedTimeOfDay(med.time_of_day || 'Morning');
    setMedNotes(med.notes || '');
    setIsMedModalOpen(true);
  };

  const handleSaveMed = async (e) => {
    e.preventDefault();
    if (!medName.trim()) {
      showToast('Medication name is required', 'error');
      return;
    }
    const payload = {
      name: medName,
      dosage: medDosage,
      frequency: medFrequency,
      time_of_day: medTimeOfDay,
      notes: medNotes
    };
    try {
      let res;
      if (medModalMode === 'add') {
        res = await fetch('/api/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/medications/${selectedMedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        showToast(medModalMode === 'add' ? 'Medication added successfully!' : 'Medication updated successfully!', 'success');
        setIsMedModalOpen(false);
        fetchMedications();
      } else {
        showToast('Failed to save medication', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving medication', 'error');
    }
  };

  const handleDeleteMed = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    try {
      const res = await fetch(`/api/medications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Medication deleted successfully!', 'success');
        fetchMedications();
      } else {
        showToast('Failed to delete medication', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting medication', 'error');
    }
  };

  // --- APPOINTMENTS CRUD ---
  const handleOpenAddApptModal = () => {
    setApptModalMode('add');
    setSelectedApptId(null);
    setApptProvider('');
    setApptSpecialty('');
    setApptDate('');
    setApptTime('');
    setApptNotes('');
    setIsApptModalOpen(true);
  };

  const handleOpenEditApptModal = (appt) => {
    setApptModalMode('edit');
    setSelectedApptId(appt.id);
    setApptProvider(appt.provider || '');
    setApptSpecialty(appt.specialty || '');
    setApptDate(appt.appointment_date || '');
    setApptTime(appt.appointment_time || '');
    setApptNotes(appt.notes || '');
    setIsApptModalOpen(true);
  };

  const handleSaveAppt = async (e) => {
    e.preventDefault();
    if (!apptProvider.trim() || !apptDate) {
      showToast('Provider and Date are required', 'error');
      return;
    }
    const payload = {
      provider: apptProvider,
      specialty: apptSpecialty,
      appointment_date: apptDate,
      appointment_time: apptTime,
      notes: apptNotes
    };
    try {
      let res;
      if (apptModalMode === 'add') {
        res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/appointments/${selectedApptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        showToast(apptModalMode === 'add' ? 'Appointment scheduled successfully!' : 'Appointment updated successfully!', 'success');
        setIsApptModalOpen(false);
        fetchAppointments();
      } else {
        showToast('Failed to save appointment', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving appointment', 'error');
    }
  };

  const handleDeleteAppt = async (id) => {
    if (!window.confirm('Are you sure you want to cancel/delete this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Appointment deleted successfully!', 'success');
        fetchAppointments();
      } else {
        showToast('Failed to delete appointment', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting appointment', 'error');
    }
  };

  // --- STATS & APPOINTMENT EVALUATIONS ---
  const getWeeklyStats = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last7DaysLogs = history.filter(h => {
      const logDate = new Date(h.log_date);
      return logDate >= oneWeekAgo && logDate <= today;
    });

    const totalSteps = last7DaysLogs.reduce((sum, h) => sum + (h.steps || 0), 0);
    
    const sleepLogs = last7DaysLogs.filter(h => h.sleep_hours !== null);
    const avgSleep = sleepLogs.length > 0 ? (sleepLogs.reduce((sum, h) => sum + h.sleep_hours, 0) / sleepLogs.length).toFixed(1) : 0;

    const waterLogs = last7DaysLogs.filter(h => h.water_ml !== null);
    const avgWater = waterLogs.length > 0 ? Math.round(waterLogs.reduce((sum, h) => sum + h.water_ml, 0) / waterLogs.length) : 0;

    const moodCounts = {};
    last7DaysLogs.forEach(h => {
      if (h.mood) moodCounts[h.mood] = (moodCounts[h.mood] || 0) + 1;
    });
    let topMood = 'None';
    let maxCount = 0;
    Object.keys(moodCounts).forEach(m => {
      if (moodCounts[m] > maxCount) {
        maxCount = moodCounts[m];
        topMood = m;
      }
    });

    return { totalSteps, avgSleep, avgWater, topMood };
  };

  const stats = getWeeklyStats();

  const getAppointmentsAnalytics = () => {
    const todayStr = new Date().toLocaleDateString('sv');
    const upcoming = appointments.filter(a => a.appointment_date >= todayStr).sort((a,b) => a.appointment_date.localeCompare(b.appointment_date));
    const past = appointments.filter(a => a.appointment_date < todayStr).sort((a,b) => b.appointment_date.localeCompare(a.appointment_date));

    const lastAppt = past.length > 0 ? past[0] : null;

    let needsReminder = false;
    if (upcoming.length === 0) {
      if (!lastAppt) {
        needsReminder = true;
      } else {
        const lastDate = new Date(lastAppt.appointment_date);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 365) {
          needsReminder = true;
        }
      }
    }

    return { upcoming, lastAppt, needsReminder };
  };

  const apptAnalytics = getAppointmentsAnalytics();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Page Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
          Health & Wellness
        </h2>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--muted)', padding: '0.25rem', borderRadius: 'var(--radius)' }}>
          <button 
            className={`btn ${activeSubTab === 'tracker' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem', height: 'auto', minWidth: 'auto', border: 'none', background: activeSubTab === 'tracker' ? 'var(--primary)' : 'transparent' }}
            onClick={() => setActiveSubTab('tracker')}
          >
            <Activity size={15} style={{ marginRight: '0.35rem' }} /> Daily Tracker
          </button>
          <button 
            className={`btn ${activeSubTab === 'medications' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem', height: 'auto', minWidth: 'auto', border: 'none', background: activeSubTab === 'medications' ? 'var(--primary)' : 'transparent' }}
            onClick={() => setActiveSubTab('medications')}
          >
            <Pill size={15} style={{ marginRight: '0.35rem' }} /> Medications
          </button>
          <button 
            className={`btn ${activeSubTab === 'appointments' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem', height: 'auto', minWidth: 'auto', border: 'none', background: activeSubTab === 'appointments' ? 'var(--primary)' : 'transparent' }}
            onClick={() => setActiveSubTab('appointments')}
          >
            <CalendarIcon size={15} style={{ marginRight: '0.35rem' }} /> Doctor Appointments
          </button>
        </div>
      </div>

      {/* SUBTAB CONTENT: DAILY TRACKER */}
      {activeSubTab === 'tracker' && (
        <>
          {/* Analytics widgets row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>WEEKLY STEPS</span>
                <Activity size={18} style={{ color: '#10b981' }} />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.totalSteps.toLocaleString()}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Goal: 70,000 / week ({Math.min(100, Math.round((stats.totalSteps / 70000) * 100))}% reached)
              </span>
              <div style={{ width: '100%', height: '6px', background: 'var(--muted)', borderRadius: '10px', overflow: 'hidden', marginTop: '0.25rem' }}>
                <div style={{ width: `${Math.min(100, Math.round((stats.totalSteps / 70000) * 100))}%`, height: '100%', background: '#10b981', borderRadius: '10px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>AVG WATER INTAKE</span>
                <Droplets size={18} style={{ color: '#3b82f6' }} />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.avgWater} ml</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Goal: 2,000 ml / day ({Math.min(100, Math.round((stats.avgWater / 2000) * 100))}% reached)
              </span>
              <div style={{ width: '100%', height: '6px', background: 'var(--muted)', borderRadius: '10px', overflow: 'hidden', marginTop: '0.25rem' }}>
                <div style={{ width: `${Math.min(100, Math.round((stats.avgWater / 2000) * 100))}%`, height: '100%', background: '#3b82f6', borderRadius: '10px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>AVG SLEEP HOURS</span>
                <Moon size={18} style={{ color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.avgSleep} hrs</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Goal: 8 hrs / night ({Math.min(100, Math.round((stats.avgSleep / 8) * 100))}% reached)
              </span>
              <div style={{ width: '100%', height: '6px', background: 'var(--muted)', borderRadius: '10px', overflow: 'hidden', marginTop: '0.25rem' }}>
                <div style={{ width: `${Math.min(100, Math.round((stats.avgSleep / 8) * 100))}%`, height: '100%', background: '#8b5cf6', borderRadius: '10px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>DOMINANT MOOD</span>
                <Smile size={18} style={{ color: '#f59e0b' }} />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.topMood}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in the last 7 days</span>
            </div>
          </div>

          {/* Logging Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSaveLog} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HeartPulse size={18} style={{ color: 'var(--primary)' }} /> Log Health Metrics
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={14} style={{ color: 'var(--muted-foreground)' }} />
                    <input
                      type="date"
                      className="input-control"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ width: '130px', padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.75rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="health-steps">Steps Taken</label>
                    <input
                      id="health-steps"
                      type="number"
                      className="input-control"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder="e.g. 8500"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="health-water">Water (ml)</label>
                    <input
                      id="health-water"
                      type="number"
                      className="input-control"
                      value={water}
                      onChange={(e) => setWater(e.target.value)}
                      placeholder="e.g. 1500"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="health-sleep">Sleep (Hours)</label>
                    <input
                      id="health-sleep"
                      type="number"
                      step="0.1"
                      className="input-control"
                      value={sleep}
                      onChange={(e) => setSleep(e.target.value)}
                      placeholder="e.g. 7.5"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="health-weight">Weight</label>
                    <input
                      id="health-weight"
                      type="number"
                      step="0.1"
                      className="input-control"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 165"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mood</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {MOODS.map(m => (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setMood(m.label)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: '20px',
                          background: mood === m.label ? m.color : 'transparent',
                          color: mood === m.label ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.8125rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="health-notes">General Notes</label>
                  <textarea
                    id="health-notes"
                    className="input-control"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe how you feel..."
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '0.5rem', alignSelf: 'flex-end' }}>
                  <Save size={16} /> Save Daily Log
                </button>
              </form>
            </div>

            {/* History Logs list */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxH: '480px', overflowY: 'auto' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                Log History
              </h3>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                  <div className="animate-spin" style={{ width: '1.5rem', height: '1.5rem', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
                </div>
              ) : history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.map(log => {
                    const moodObj = MOODS.find(m => m.label === log.mood);
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedDate(log.log_date)}
                        style={{
                          padding: '0.75rem 1rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          background: selectedDate === log.log_date ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          borderColor: selectedDate === log.log_date ? 'var(--primary)' : 'var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.875rem' }}>
                            {new Date(log.log_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </strong>
                          {moodObj && (
                            <span style={{ fontSize: '0.8125rem' }}>{moodObj.emoji} {moodObj.label}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {log.steps !== null && <span>👟 {log.steps.toLocaleString()} steps</span>}
                          {log.water_ml !== null && <span>💧 {log.water_ml} ml</span>}
                          {log.sleep_hours !== null && <span>🌙 {log.sleep_hours} hrs</span>}
                          {log.weight !== null && <span>⚖️ {log.weight} lbs</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>
                  No historical health logs found. Log metrics above!
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* SUBTAB CONTENT: MEDICATIONS */}
      {activeSubTab === 'medications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pill size={20} style={{ color: 'var(--primary)' }} /> Medication Cabinet
            </h3>
          </div>

          {medications.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {medications.map(med => (
                <div key={med.id} className="card hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.0625rem' }}>{med.name}</h4>
                    <span style={{ fontSize: '0.6875rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
                      {med.time_of_day}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {med.dosage && (
                      <div><strong>Dosage:</strong> {med.dosage}</div>
                    )}
                    {med.frequency && (
                      <div><strong>Frequency:</strong> {med.frequency}</div>
                    )}
                    {med.notes && (
                      <div style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{med.notes}"</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.3rem 0.5rem', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }} onClick={() => handleOpenEditMedModal(med)}>
                      <Edit2 size={11} /> Edit
                    </button>
                    <button className="btn btn-danger" style={{ minWidth: 'auto', padding: '0.3rem 0.5rem', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }} onClick={() => handleDeleteMed(med.id)}>
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <p style={{ margin: 0 }}>No medications logged. Click "Add Medication" to keep a schedule of your health supplements or prescriptions.</p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB CONTENT: APPOINTMENTS */}
      {activeSubTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* APPOINTMENT ALERT BANNER */}
          {apptAnalytics.needsReminder && (
            <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.05) 100%)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem', color: '#ef4444' }}>Wellness Appointment Reminder</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  You have no upcoming doctor appointments scheduled, and your last appointment was over 12 months ago (or never logged). We highly recommend scheduling a routine physical or wellness checkup.
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} style={{ color: 'var(--primary)' }} /> Medical Appointments
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Left Panel: Last Appointment + Upcoming list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Last Appointment Card */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>LAST COMPLETED APPOINTMENT</span>
                {apptAnalytics.lastAppt ? (
                  <div>
                    <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.0625rem' }}>{apptAnalytics.lastAppt.provider}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.125rem' }}>
                      {apptAnalytics.lastAppt.specialty && `${apptAnalytics.lastAppt.specialty} • `}
                      {new Date(apptAnalytics.lastAppt.appointment_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {apptAnalytics.lastAppt.notes && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        "{apptAnalytics.lastAppt.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No historical appointments logged.</span>
                )}
              </div>

              {/* Upcoming List */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>UPCOMING APPOINTMENTS</span>
                {apptAnalytics.upcoming.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {apptAnalytics.upcoming.map(appt => (
                      <div key={appt.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.875rem', display: 'block' }}>{appt.provider}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {appt.specialty && `${appt.specialty} • `}
                            {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {appt.appointment_time && ` @ ${appt.appointment_time}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.25rem 0.4rem', height: '1.75rem' }} title="Edit" onClick={() => handleOpenEditApptModal(appt)}>
                            <Edit2 size={11} />
                          </button>
                          <button className="btn btn-danger" style={{ minWidth: 'auto', padding: '0.25rem 0.4rem', height: '1.75rem' }} title="Cancel" onClick={() => handleDeleteAppt(appt.id)}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No future appointments scheduled.</span>
                )}
              </div>

            </div>

            {/* Right Panel: All Appointment History Log */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxH: '480px', overflowY: 'auto' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>ALL LOGGED APPOINTMENTS</span>
              {appointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {appointments.slice().sort((a,b) => b.appointment_date.localeCompare(a.appointment_date)).map(appt => {
                    const isUpcoming = appt.appointment_date >= new Date().toLocaleDateString('sv');
                    return (
                      <div key={appt.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.875rem' }}>{appt.provider}</strong>
                          <span style={{
                            fontSize: '0.625rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            background: isUpcoming ? 'rgba(16, 185, 129, 0.15)' : 'var(--muted)',
                            color: isUpcoming ? '#10b981' : 'var(--muted-foreground)'
                          }}>
                            {isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {appt.specialty && `${appt.specialty} • `}
                          {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {appt.notes && <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-muted)' }}>"{appt.notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No medical appointments logged.</span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MEDICATION MODAL */}
      {isMedModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMedModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{medModalMode === 'add' ? 'Add Medication' : 'Edit Medication'}</h2>
              <button className="close-btn" onClick={() => setIsMedModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveMed} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="med-name">Medication Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="med-name"
                    type="text"
                    className="input-control"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Lisinopril"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="med-dosage">Dosage</label>
                    <input
                      id="med-dosage"
                      type="text"
                      className="input-control"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="e.g. 10mg"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="med-time">Time of Day</label>
                    <select
                      id="med-time"
                      className="input-control"
                      value={medTimeOfDay}
                      onChange={(e) => setMedTimeOfDay(e.target.value)}
                    >
                      <option value="Morning">Morning</option>
                      <option value="Noon">Noon</option>
                      <option value="Evening">Evening</option>
                      <option value="Bedtime">Bedtime</option>
                      <option value="As Needed">As Needed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="med-freq">Frequency</label>
                  <input
                    id="med-freq"
                    type="text"
                    className="input-control"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    placeholder="e.g. Daily, Twice Daily, Weekly"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="med-notes">Special Instructions / Notes</label>
                  <textarea
                    id="med-notes"
                    className="input-control"
                    rows="2"
                    value={medNotes}
                    onChange={(e) => setMedNotes(e.target.value)}
                    placeholder="Take with food, avoid grapefruit, etc..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsMedModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ gap: '0.25rem' }}><Check size={16} /> Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT MODAL */}
      {isApptModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApptModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{apptModalMode === 'add' ? 'Schedule Appointment' : 'Edit Appointment'}</h2>
              <button className="close-btn" onClick={() => setIsApptModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveAppt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="appt-provider">Doctor / Provider <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="appt-provider"
                    type="text"
                    className="input-control"
                    value={apptProvider}
                    onChange={(e) => setApptProvider(e.target.value)}
                    placeholder="e.g. Dr. Elizabeth Blackwell"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="appt-spec">Specialty</label>
                  <input
                    id="appt-spec"
                    type="text"
                    className="input-control"
                    value={apptSpecialty}
                    onChange={(e) => setApptSpecialty(e.target.value)}
                    placeholder="e.g. Primary Care, Cardiology, Dentist"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="appt-date">Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      id="appt-date"
                      type="date"
                      className="input-control"
                      value={apptDate}
                      onChange={(e) => setApptDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="appt-time">Time</label>
                    <input
                      id="appt-time"
                      type="time"
                      className="input-control"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="appt-notes">Notes / Reason for Visit</label>
                  <textarea
                    id="appt-notes"
                    className="input-control"
                    rows="2"
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    placeholder="Routine exam, blood pressure follow-up..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsApptModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ gap: '0.25rem' }}><Check size={16} /> Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
