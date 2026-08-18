import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  ListTodo,
  Receipt,
  ChefHat,
  Utensils,
  AlertTriangle,
  Soup,
  BookOpen,
  Bookmark,
  Flame
} from 'lucide-react';

export default function HomeView({ onNavigateTab, user }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bills, setBills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  
  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchSubscriptions();
    fetchBills();
    fetchKitchenData();
    fetchContacts();
    fetchWeather();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/focusflow/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    }
  };

  const fetchKitchenData = async () => {
    try {
      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        setWeeklyMenu(data);
      }
    } catch (e) {
      console.error('Failed to load kitchen dashboard data:', e);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getWeatherInfo = (code) => {
    if (code === undefined || code === null) return { text: 'Unknown', icon: '❓' };
    switch (code) {
      case 0: return { text: 'Clear Sky', icon: '☀️' };
      case 1: case 2: case 3: return { text: 'Partly Cloudy', icon: '⛅' };
      case 45: case 48: return { text: 'Foggy', icon: '🌫️' };
      case 51: case 53: case 55: return { text: 'Drizzle', icon: '🌧️' };
      case 56: case 57: return { text: 'Freezing Drizzle', icon: '🌧️' };
      case 61: case 63: case 65: return { text: 'Rainy', icon: '🌧️' };
      case 66: case 67: return { text: 'Freezing Rain', icon: '🌧️' };
      case 71: case 73: case 75: return { text: 'Snowy', icon: '❄️' };
      case 77: return { text: 'Snow Grains', icon: '❄️' };
      case 80: case 81: case 82: return { text: 'Rain Showers', icon: '🌦️' };
      case 85: case 86: return { text: 'Snow Showers', icon: '❄️' };
      case 95: return { text: 'Thunderstorms', icon: '⛈️' };
      case 96: case 99: return { text: 'Thunderstorms w/ Hail', icon: '⛈️' };
      default: return { text: 'Overcast', icon: '☁️' };
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todaysMeals = weeklyMenu.filter(item => item.day_of_week === todayDayName);

  const todayDateStr = new Date().toLocaleDateString('sv');
  const todayEvents = events.filter(e => {
    if (!e.start_time) return false;
    return e.start_time.split('T')[0] === todayDateStr;
  });

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const isPending = t.status !== 'completed' && !t.completed;
    return isPending && t.due_date.split('T')[0] === todayDateStr;
  });

  const todayBills = bills.filter(b => b.due_date && b.due_date.split('T')[0] === todayDateStr);
  const todaySubs = subscriptions.filter(s => s.next_billing_date && s.next_billing_date.split('T')[0] === todayDateStr);

  const todayObj = new Date();
  const currentMonth = todayObj.getMonth() + 1;
  const currentDay = todayObj.getDate();
  
  const todayBirthdays = contacts.filter(c => {
    if (!c.birthday) return false;
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return m === currentMonth && d === currentDay;
    }
    return false;
  }).map(c => {
    const parts = c.birthday.split('-');
    const age = todayObj.getFullYear() - parseInt(parts[0], 10);
    return { name: c.name, age };
  });

  const todayAnniversaries = todayEvents.filter(e => {
    const title = e.title || '';
    return title.toLowerCase().includes('anniversary');
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Merged Welcome & What's Happening Today Card */}
      <div 
        className="card animate-fade-in" 
        style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(30, 30, 35, 0.4) 100%)', 
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Welcome Section / Header of merged card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: 'var(--foreground)' }}>
              {getGreeting()}, {user?.display_name || user?.username}!
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.35rem', fontSize: '0.875rem', marginBottom: 0 }}>
              Here is a summary of what's happening in your household today.
            </p>
          </div>

          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.75rem' }}>{getWeatherInfo(weather.current?.weathercode).icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                  {weather.current?.temperature}°{weather.unit === 'celsius' ? 'C' : 'F'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  {getWeatherInfo(weather.current?.weathercode).text} {weather.daily?.temperature_2m_min?.[0] !== undefined && `(Low: ${weather.daily?.temperature_2m_min?.[0]}° / High: ${weather.daily?.temperature_2m_max?.[0]}°)`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* What's Happening Today Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📅</span> What's Happening Today
            </h3>
            <p style={{ color: 'var(--muted-foreground)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
            
            {/* Column: Today's Meals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#ec4899', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Today's Meals
              </h4>
              {todaysMeals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todaysMeals.map(meal => (
                    <div key={meal.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '4px', borderLeft: '3px solid #ec4899' }}>
                      <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>{meal.meal_type}</span>
                      <strong style={{ color: 'var(--foreground)' }}>{meal.recipe_title || meal.custom_meal || 'Leftovers'}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No meals planned today.</span>
              )}
            </div>

            {/* Column 1: Today's Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Today's Schedule
              </h4>
              {todayEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayEvents.map(e => (
                    <div key={e.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', borderLeft: '3px solid var(--primary)' }}>
                      <strong style={{ display: 'block', color: 'var(--foreground)' }}>{e.title}</strong>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>
                        {e.all_day ? 'All Day' : new Date(e.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No events scheduled today.</span>
              )}
            </div>

            {/* Column 2: Tasks Due Today */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#10b981', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Tasks Due Today
              </h4>
              {todayTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayTasks.map(t => (
                    <div key={t.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                      <span style={{ color: 'var(--foreground)' }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No tasks due today.</span>
              )}
            </div>

            {/* Column 3: Celebrations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Celebrations
              </h4>
              {(todayBirthdays.length > 0 || todayAnniversaries.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayBirthdays.map((b, idx) => (
                    <div key={`bday-${idx}`} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', borderLeft: '3px solid #ef4444', color: '#fca5a5' }}>
                      <strong>🎂 {b.name}</strong> (turning {b.age} today!)
                    </div>
                  ))}
                  {todayAnniversaries.map(a => (
                    <div key={a.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', borderLeft: '3px solid #f59e0b', color: '#fde047' }}>
                      <strong>🥂 {a.title}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No birthdays or anniversaries today.</span>
              )}
            </div>

            {/* Column 4: Bills & Subscriptions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#3b82f6', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Bills & Subscriptions
              </h4>
              {(todayBills.length > 0 || todaySubs.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayBills.map(b => (
                    <div key={b.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <span style={{ color: 'var(--foreground)' }}>💸 {b.name} (${b.amount})</span>
                    </div>
                  ))}
                  {todaySubs.map(s => (
                    <div key={s.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' }}>
                      <span style={{ color: 'var(--foreground)' }}>🔁 {s.name} (${s.amount})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No bills or subscriptions due today.</span>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
