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
  AlertCircle,
  Receipt,
  Tag
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

export default function BillsView({ showToast }) {
  const [bills, setBills] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  
  // Bill Form states
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCycle, setBillCycle] = useState('monthly');
  const [billBillingDate, setBillBillingDate] = useState('');
  const [billTag, setBillTag] = useState('');
  const [billPaymentMethod, setBillPaymentMethod] = useState('');
  const [billActive, setBillActive] = useState(1);

  useEffect(() => {
    fetchBills();
    fetchTags();
  }, []);

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

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/bills/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setBillName('');
    setBillAmount('');
    setBillCycle('monthly');
    setBillBillingDate(new Date().toISOString().split('T')[0]);
    setBillTag('');
    setBillPaymentMethod('');
    setBillActive(1);
    setIsModalOpen(true);
  };

  const openEditModal = (bill) => {
    setModalMode('edit');
    setSelectedBillId(bill.id);
    setBillName(bill.name || '');
    setBillAmount(bill.amount !== undefined && bill.amount !== null ? bill.amount : '');
    setBillCycle(bill.billing_cycle || 'monthly');
    setBillBillingDate(formatDateForInput(bill.next_billing_date));
    setBillTag(bill.tag || '');
    setBillPaymentMethod(bill.payment_method || '');
    setBillActive(bill.active !== undefined && bill.active !== null ? bill.active : 1);
    setIsModalOpen(true);
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (!billName || !billName.trim()) {
      showToast('Bill Name is required.', 'error');
      return;
    }
    if (billAmount === '' || billAmount === undefined || billAmount === null) {
      showToast('Amount is required.', 'error');
      return;
    }
    if (isNaN(parseFloat(billAmount))) {
      showToast('Amount must be a valid number.', 'error');
      return;
    }
    if (!billBillingDate) {
      showToast('Due Date is required.', 'error');
      return;
    }

    const body = {
      name: billName.trim(),
      amount: parseFloat(billAmount),
      billing_cycle: billCycle,
      next_billing_date: billBillingDate,
      tag: billTag.trim(),
      payment_method: billPaymentMethod,
      active: (billActive !== undefined && billActive !== null && !isNaN(parseInt(billActive, 10))) ? parseInt(billActive, 10) : 1
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/bills/${selectedBillId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchBills();
        fetchTags(); // Reload list of tags in autocomplete
        showToast(modalMode === 'create' ? 'Bill added!' : 'Bill updated!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save bill', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    }
  };

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchBills();
        fetchTags();
        showToast('Bill deleted.', 'success');
      }
    } catch (err) {
      showToast('Failed to delete bill.', 'error');
    }
  };

  const handleToggleStatus = async (bill) => {
    const nextActive = bill.active === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive })
      });

      if (res.ok) {
        setBills(prev => prev.map(b => b.id === bill.id ? { ...b, active: nextActive } : b));
        showToast(nextActive === 1 ? 'Bill activated!' : 'Bill paused.', 'success');
      }
    } catch (err) {
      showToast('Failed to toggle bill status.', 'error');
    }
  };

  // Analytics calculations
  const activeBills = bills.filter(b => b.active === 1);

  const totalMonthlySpend = activeBills.reduce((acc, curr) => {
    if (curr.billing_cycle === 'monthly') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount / 12);
    }
  }, 0);

  const totalAnnualSpend = activeBills.reduce((acc, curr) => {
    if (curr.billing_cycle === 'annual') {
      return acc + curr.amount;
    } else {
      return acc + (curr.amount * 12);
    }
  }, 0);

  const renewalsNext30Days = activeBills.filter(b => {
    const nextDate = new Date(b.next_billing_date);
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Recurring Bills Management</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>Track recurring household bills, custom tags, and billing dates.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Add Bill
        </button>
      </div>

      {/* Analytics Cards Dashboard */}
      <div className="grid-3">
        {/* Card 1: Monthly Cost */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--bg-card), var(--primary-light))' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary)', color: '#ffffff' }}>
            <Receipt size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Bills Cost</span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Proj. Cost</span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bills Due (Next 30d)</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.2rem 0 0 0' }}>
              {renewalsNext30Days.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Bills Grid List */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' }}>
              <th style={{ padding: '1rem' }}>NAME</th>
              <th style={{ padding: '1rem' }}>AMOUNT</th>
              <th style={{ padding: '1rem' }}>BILLING CYCLE</th>
              <th style={{ padding: '1rem' }}>TAG</th>
              <th style={{ padding: '1rem' }}>NEXT DUE DATE</th>
              <th style={{ padding: '1rem' }}>PAYMENT METHOD</th>
              <th style={{ padding: '1rem' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => (
              <tr 
                key={bill.id} 
                style={{ 
                  borderBottom: '1px solid var(--border-color)', 
                  opacity: bill.active === 1 ? 1 : 0.6,
                  transition: 'background 0.2s'
                }}
                className="hover-lift"
              >
                <td style={{ padding: '1rem', fontWeight: '600' }}>{bill.name}</td>
                <td style={{ padding: '1rem', fontWeight: '700' }}>${bill.amount.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${bill.billing_cycle === 'annual' ? 'badge-info' : 'badge-success'}`}>
                    {bill.billing_cycle}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {bill.tag ? (
                    <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Tag size={12} /> {bill.tag}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{bill.next_billing_date}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {bill.payment_method ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CreditCard size={14} /> {bill.payment_method}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => handleToggleStatus(bill)}
                    style={{
                      border: 'none',
                      background: bill.active === 1 ? 'rgba(76, 175, 80, 0.15)' : 'var(--border-color)',
                      color: bill.active === 1 ? '#2e7d32' : 'var(--text-muted)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {bill.active === 1 ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem', minWidth: 'auto' }}
                      onClick={() => openEditModal(bill)}
                      title="Edit Bill"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem', minWidth: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDeleteBill(bill.id)}
                      title="Delete Bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  No bills added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Edit/Create Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                {modalMode === 'create' ? 'Add Recurring Bill' : 'Edit Bill Details'}
              </h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveBill} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
              <div className="form-group">
                <label>Bill Name</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Gas Bill, Rent, Gym" 
                  value={billName}
                  onChange={e => setBillName(e.target.value)}
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
                    placeholder="e.g. 85.50" 
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Billing Cycle</label>
                  <select 
                    className="input-control"
                    value={billCycle}
                    onChange={e => setBillCycle(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Next Due Date</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={billBillingDate}
                    onChange={e => setBillBillingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tag</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="Type or select a tag"
                    value={billTag}
                    onChange={e => setBillTag(e.target.value)}
                    list="existing-tags"
                  />
                  <datalist id="existing-tags">
                    {tags.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Payment Method</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Bank Auto-pay, Visa" 
                    value={billPaymentMethod}
                    onChange={e => setBillPaymentMethod(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select 
                    className="input-control"
                    value={billActive}
                    onChange={e => setBillActive(parseInt(e.target.value, 10))}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Paused</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
