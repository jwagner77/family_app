import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return '';
};

export default function SubscriptionsView({ showToast }) {
  const [subscriptions, setSubscriptions] = useState([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  
  // Subscription Form states
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCycle, setSubCycle] = useState('monthly');
  const [subBillingDate, setSubBillingDate] = useState('');
  const [subCategory, setSubCategory] = useState('Entertainment');
  const [subPaymentMethod, setSubPaymentMethod] = useState('');
  const [subActive, setSubActive] = useState(1);

  useEffect(() => {
    fetchSubscriptions();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'subscriptions') {
        openCreateModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

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

  const openCreateModal = () => {
    setModalMode('create');
    setSubName('');
    setSubAmount('');
    setSubCycle('monthly');
    setSubBillingDate(new Date().toISOString().split('T')[0]);
    setSubCategory('Entertainment');
    setSubPaymentMethod('');
    setSubActive(1);
    setIsModalOpen(true);
  };

  const openEditModal = (sub) => {
    setModalMode('edit');
    setSelectedSubId(sub.id);
    setSubName(sub.name || '');
    setSubAmount(sub.amount !== undefined && sub.amount !== null ? sub.amount : '');
    setSubCycle(sub.billing_cycle || 'monthly');
    setSubBillingDate(formatDateForInput(sub.next_billing_date));
    setSubCategory(sub.category || 'Entertainment');
    setSubPaymentMethod(sub.payment_method || '');
    setSubActive(sub.active !== undefined && sub.active !== null ? sub.active : 1);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!subName || !subName.trim()) {
      showToast('Subscription Name is required.', 'error');
      return;
    }
    if (subAmount === '' || subAmount === undefined || subAmount === null) {
      showToast('Amount is required.', 'error');
      return;
    }
    if (isNaN(parseFloat(subAmount))) {
      showToast('Amount must be a valid number.', 'error');
      return;
    }
    if (!subBillingDate) {
      showToast('Billing Date is required.', 'error');
      return;
    }

    const body = {
      name: subName.trim(),
      amount: parseFloat(subAmount),
      billing_cycle: subCycle,
      next_billing_date: subBillingDate,
      category: subCategory,
      payment_method: subPaymentMethod,
      active: (subActive !== undefined && subActive !== null && !isNaN(parseInt(subActive, 10))) ? parseInt(subActive, 10) : 1
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/subscriptions/${selectedSubId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchSubscriptions();
        showToast(modalMode === 'create' ? 'Subscription added!' : 'Subscription updated!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save subscription', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchSubscriptions();
        showToast('Subscription deleted.', 'success');
      }
    } catch (err) {
      showToast('Failed to delete subscription.', 'error');
    }
  };

  const handleToggleStatus = async (sub) => {
    const nextActive = sub.active === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive })
      });

      if (res.ok) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, active: nextActive } : s));
        showToast(nextActive === 1 ? 'Subscription activated!' : 'Subscription paused.', 'success');
      }
    } catch (err) {
      showToast('Failed to toggle subscription status.', 'error');
    }
  };

  // Analytics calculations
  const activeSubs = subscriptions.filter(s => s.active === 1);

  const totalMonthlySpend = activeSubs.reduce((acc, curr) => {
    if (curr.billing_cycle === 'monthly') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount / 12);
    }
  }, 0);

  const totalAnnualSpend = activeSubs.reduce((acc, curr) => {
    if (curr.billing_cycle === 'annual') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount * 12);
    }
  }, 0);

  const renewalsNext30Days = activeSubs.filter(s => {
    const nextDate = new Date(s.next_billing_date);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Page Title & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Subscription Management</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>Track recurring bills, monthly spend, and upcoming renewals.</p>
        </div>
      </div>

      {/* Analytics Cards Dashboard */}
      <div className="grid-3">
        {/* Card 1: Monthly Cost */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--bg-card), var(--primary-light))' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary)', color: '#ffffff' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Spending</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.2rem 0 0 0' }}>
              ${totalMonthlySpend.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Card 2: Annual Cost */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Proj. Spend</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.2rem 0 0 0' }}>
              ${totalAnnualSpend.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Card 3: Renewals next 30 days */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(255, 152, 0, 0.15)', color: '#ff9800' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Renewals (Next 30d)</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.2rem 0 0 0' }}>
              {renewalsNext30Days.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Subscription Grid List */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' }}>
              <th style={{ padding: '1rem' }}>NAME</th>
              <th style={{ padding: '1rem' }}>AMOUNT</th>
              <th style={{ padding: '1rem' }}>BILLING CYCLE</th>
              <th style={{ padding: '1rem' }}>CATEGORY</th>
              <th style={{ padding: '1rem' }}>NEXT BILLING DATE</th>
              <th style={{ padding: '1rem' }}>PAYMENT METHOD</th>
              <th style={{ padding: '1rem' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr 
                key={sub.id} 
                style={{ 
                  borderBottom: '1px solid var(--border-color)', 
                  opacity: sub.active === 1 ? 1 : 0.6,
                  transition: 'background 0.2s'
                }}
                className="hover-lift"
              >
                <td style={{ padding: '1rem', fontWeight: '600' }}>{sub.name}</td>
                <td style={{ padding: '1rem', fontWeight: '700' }}>${sub.amount.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${sub.billing_cycle === 'annual' ? 'badge-info' : 'badge-success'}`}>
                    {sub.billing_cycle}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>{sub.category || 'Entertainment'}</td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{sub.next_billing_date}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {sub.payment_method ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CreditCard size={14} /> {sub.payment_method}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => handleToggleStatus(sub)}
                    style={{
                      border: 'none',
                      background: sub.active === 1 ? 'rgba(76, 175, 80, 0.15)' : 'var(--border-color)',
                      color: sub.active === 1 ? '#2e7d32' : 'var(--text-muted)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {sub.active === 1 ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem', minWidth: 'auto' }}
                      onClick={() => openEditModal(sub)}
                      title="Edit Subscription"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem', minWidth: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDeleteSubscription(sub.id)}
                      title="Delete Subscription"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  No subscriptions added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Subscription Edit/Create Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Add Subscription' : 'Edit Subscription Details'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
            
            <form onSubmit={handleSaveSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
              <div className="form-group">
                <label>Subscription Name</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Netflix, Electricity Bill" 
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Amount ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-control" 
                    placeholder="e.g. 15.99" 
                    value={subAmount}
                    onChange={e => setSubAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Billing Cycle</label>
                  <select 
                    className="input-control"
                    value={subCycle}
                    onChange={e => setSubCycle(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Next Billing Date</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={subBillingDate}
                    onChange={e => setSubBillingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select 
                    className="input-control"
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                  >
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Housing">Housing</option>
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Payment Method</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Chase Credit Card, PayPal" 
                    value={subPaymentMethod}
                    onChange={e => setSubPaymentMethod(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select 
                    className="input-control"
                    value={subActive}
                    onChange={e => setSubActive(parseInt(e.target.value, 10))}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Paused</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Subscription</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
