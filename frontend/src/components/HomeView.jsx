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
  Receipt
} from 'lucide-react';

export default function HomeView({ onNavigateTab, user }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bills, setBills] = useState([]);
  
  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchSubscriptions();
    fetchBills();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/todo/all-tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
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

  // Get dynamic greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter items
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  // Upcoming / Overdue Tasks
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const upcomingTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    return t.due_date <= nextWeekStr;
  });

  // Upcoming Events in the next 7 days
  const upcomingEvents = events.filter(e => {
    const eventDate = e.start_time.split('T')[0];
    return eventDate >= todayStr && eventDate <= nextWeekStr;
  });

  // Active subscriptions renewal alerts (next 7 days)
  const activeSubs = subscriptions.filter(s => s.active === 1);
  const renewingSubsSoon = activeSubs.filter(s => {
    const nextDate = new Date(s.next_billing_date);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Active bills renewals (next 7 days)
  const activeBills = bills.filter(b => b.active === 1);
  const upcomingBillsSoon = activeBills.filter(b => {
    const nextDate = new Date(b.next_billing_date);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Sum monthly spending
  const monthlySubscriptionSpend = activeSubs.reduce((acc, curr) => {
    if (curr.billing_cycle === 'monthly') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount / 12);
    }
  }, 0);

  const monthlyBillSpend = activeBills.reduce((acc, curr) => {
    if (curr.billing_cycle === 'monthly') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount / 12);
    }
  }, 0);

  const totalMonthlySpend = monthlySubscriptionSpend + monthlyBillSpend;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, var(--bg-card), var(--primary-light))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            {getGreeting()}, {user?.display_name || user?.username}! 🏠
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem', marginBottom: 0 }}>
            Here is a summary of what's happening in your household.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>TASKS TO DO</span>
            <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{pendingTasks.length}</h4>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>SUBSCRIPTION SPEND</span>
            <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>${monthlySubscriptionSpend.toFixed(0)}</h4>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>BILL SPEND</span>
            <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>${monthlyBillSpend.toFixed(0)}</h4>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL SPEND</span>
            <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>${totalMonthlySpend.toFixed(0)}</h4>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* Column 1: Tasks Due Soon */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ListTodo size={20} style={{ color: '#4caf50' }} /> Tasks Due Soon
            </h3>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => onNavigateTab('todo')}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingTasks.slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: '12px', background: 'var(--bg-main)' }}>
                <CheckCircle size={18} style={{ color: 'var(--text-muted)', marginTop: '0.15rem', shrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>{task.title}</h5>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '600' }}>
                      Due: {task.due_date}
                    </span>
                    {task.list_name && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        in {task.list_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {upcomingTasks.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', gap: '0.5rem' }}>
                <CheckCircle size={32} style={{ color: '#4caf50', opacity: 0.5 }} />
                No tasks due this week!
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Upcoming Events */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={20} style={{ color: 'var(--primary)' }} /> Next 7 Days Events
            </h3>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => onNavigateTab('calendar')}
            >
              Calendar <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingEvents.slice(0, 5).map(event => {
              const datePart = event.start_time.split('T')[0];
              const timePart = event.start_time.split('T')[1]?.substring(0, 5) || '';
              return (
                <div key={event.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.65rem', borderRadius: '12px', background: 'var(--bg-main)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 0.6rem', borderRadius: '10px', minWidth: '50px', fontWeight: '700', fontSize: '0.8rem' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {new Date(datePart + 'T12:00:00').toLocaleString('default', { month: 'short' })}
                    </span>
                    <span>{new Date(datePart + 'T12:00:00').getDate()}</span>
                  </div>
                  
                  <div style={{ overflow: 'hidden' }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{event.title}</h5>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                      <Clock size={12} /> {timePart || 'All day'} {event.location ? `• ${event.location}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', gap: '0.5rem' }}>
                <Calendar size={32} style={{ color: 'var(--primary)', opacity: 0.5 }} />
                No events scheduled this week.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Subscription Alerts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CreditCard size={20} style={{ color: '#ff9800' }} /> Subscription Alerts
            </h3>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => onNavigateTab('subscriptions')}
            >
              Manage <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {renewingSubsSoon.map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', borderRadius: '12px', background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>{sub.name}</h5>
                  <span style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: '600' }}>
                    Renews: {sub.next_billing_date}
                  </span>
                </div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#e65100' }}>
                  ${sub.amount.toFixed(2)}
                </div>
              </div>
            ))}
            {renewingSubsSoon.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', gap: '0.5rem' }}>
                <TrendingUp size={32} style={{ color: '#ff9800', opacity: 0.5 }} />
                No subscription renewals in the next 7 days.
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Upcoming Bills */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Receipt size={20} style={{ color: '#03a9f4' }} /> Upcoming Bills
            </h3>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => onNavigateTab('bills')}
            >
              Manage <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingBillsSoon.map(bill => (
              <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', borderRadius: '12px', background: 'rgba(3, 169, 244, 0.08)', border: '1px solid rgba(3, 169, 244, 0.2)' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>{bill.name}</h5>
                  <span style={{ fontSize: '0.75rem', color: '#0288d1', fontWeight: '600' }}>
                    Due: {bill.next_billing_date} {bill.tag && `• ${bill.tag}`}
                  </span>
                </div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0288d1' }}>
                  ${bill.amount.toFixed(2)}
                </div>
              </div>
            ))}
            {upcomingBillsSoon.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', gap: '0.5rem' }}>
                <TrendingUp size={32} style={{ color: '#03a9f4', opacity: 0.5 }} />
                No bill renewals in the next 7 days.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
