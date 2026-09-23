import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Landmark,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Layers
} from 'lucide-react';

export default function MoneyView({ showToast, onNavigateToSettings }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchMoneyData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/monarch/summary');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('Failed to load financial overview');
      }
    } catch (err) {
      console.error('Error fetching money summary:', err);
      showToast('Error loading financial overview: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMoneyData();
  }, []);

  const formatCurrency = (num) => {
    const val = Number(num) || 0;
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <p style={{ fontSize: '1rem', fontWeight: '500' }}>Loading financial data from Monarch Money...</p>
      </div>
    );
  }

  if (!data || !data.connected) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(52, 152, 219, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Landmark size={32} />
          </div>

          <div style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>Connect Monarch Money</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: '1.5', margin: 0 }}>
              Integrate your Monarch Money account to see your real-time Net Worth, active bank balances, recent transactions, and automate sync with your Bills & Subscriptions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
              onClick={() => {
                if (onNavigateToSettings) {
                  onNavigateToSettings('integrations');
                } else {
                  window.location.hash = '#settings';
                }
              }}
            >
              Configure in Settings <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    netWorth = 0,
    totalCash = 0,
    totalCreditDebt = 0,
    totalInvestments = 0,
    totalLoanDebt = 0,
    accountsByCategory = { cash: [], credit: [], investments: [], loans: [], other: [] },
    recentTransactions = [],
    upcomingBills = [],
    upcomingSubscriptions = []
  } = data;

  const filteredTransactions = recentTransactions.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.merchantName && t.merchantName.toLowerCase().includes(term)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(term)) ||
      (t.accountName && t.accountName.toLowerCase().includes(term)) ||
      (t.amount && String(t.amount).includes(term))
    );
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={24} style={{ color: 'var(--primary)' }} /> Money Overview
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
            Synced live with Monarch Money ({data.totalAccountCount || 0} accounts included)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://app.monarchmoney.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', textDecoration: 'none' }}
            title="Open Monarch Money in a new tab"
          >
            <ExternalLink size={14} /> Open Monarch Money
          </a>

          <button
            type="button"
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            onClick={() => fetchMoneyData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            onClick={() => {
              if (onNavigateToSettings) {
                onNavigateToSettings('integrations');
              }
            }}
          >
            <Layers size={14} /> Settings & Sync
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Net Worth */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
              Net Worth
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(52, 152, 219, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: '800', color: netWorth >= 0 ? 'var(--foreground)' : '#ef4444' }}>
            {formatCurrency(netWorth)}
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
            Assets minus Liabilities
          </span>
        </div>

        {/* Total Cash */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
              Cash & Banking
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Landmark size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: '800', color: '#10b981' }}>
            {formatCurrency(totalCash)}
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
            {accountsByCategory.cash.length} Cash Accounts
          </span>
        </div>

        {/* Credit Card Debt */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
              Credit Cards
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <CreditCard size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: '800', color: totalCreditDebt > 0 ? '#ef4444' : 'var(--foreground)' }}>
            {formatCurrency(totalCreditDebt)}
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
            {accountsByCategory.credit.length} Credit Cards
          </span>
        </div>

        {/* Investments */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
              Investments
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <PiggyBank size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: '800', color: '#8b5cf6' }}>
            {formatCurrency(totalInvestments)}
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
            {accountsByCategory.investments.length} Investment Portfolios
          </span>
        </div>

      </div>

      {/* Main Grid: Left (Upcoming & Account Balances) & Right (Recent Transactions) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Upcoming Bills & Subscriptions, then Account Balances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Upcoming Schedule (Bills & Subscriptions) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} /> Upcoming Bills & Subscriptions
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              
              {/* Upcoming Bills Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Receipt size={14} /> Upcoming Bills
                </span>
                {upcomingBills.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No upcoming bills due soon.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {upcomingBills.slice(0, 5).map(b => (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          background: 'var(--muted)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{b.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                            Due: {formatDate(b.next_billing_date)} • {b.tag || 'Bill'}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: '#ef4444' }}>
                          {formatCurrency(b.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Subscriptions Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CreditCard size={14} /> Upcoming Subscriptions
                </span>
                {upcomingSubscriptions.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No subscriptions due soon.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {upcomingSubscriptions.slice(0, 5).map(s => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          background: 'var(--muted)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{s.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                            Renews: {formatDate(s.next_billing_date)} • {s.category || 'Sub'}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: '#8b5cf6' }}>
                          {formatCurrency(s.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Account Balances Breakdown */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={18} style={{ color: 'var(--primary)' }} /> Account Balances
              </h3>
            </div>

            {/* Cash Accounts Group */}
            {accountsByCategory.cash.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Cash & Checking
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#10b981' }}>
                    {formatCurrency(totalCash)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {accountsByCategory.cash.map(acc => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {acc.displayName}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {acc.institutionName ? `${acc.institutionName} • ` : ''}{acc.subtypeDisplay || acc.typeDisplay || 'Depository'} {acc.mask ? `(••${acc.mask})` : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credit Cards Group */}
            {accountsByCategory.credit.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Credit Cards
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444' }}>
                    {formatCurrency(totalCreditDebt)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {accountsByCategory.credit.map(acc => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {acc.displayName}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {acc.institutionName ? `${acc.institutionName} • ` : ''}Credit Card {acc.mask ? `(••${acc.mask})` : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: acc.currentBalance > 0 ? '#ef4444' : 'var(--foreground)' }}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investments Group */}
            {accountsByCategory.investments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Investments & Retirement
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#8b5cf6' }}>
                    {formatCurrency(totalInvestments)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {accountsByCategory.investments.map(acc => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {acc.displayName}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {acc.institutionName ? `${acc.institutionName} • ` : ''}{acc.subtypeDisplay || acc.typeDisplay || 'Investment'} {acc.mask ? `(••${acc.mask})` : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loans & Mortgages Group */}
            {accountsByCategory.loans.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Loans & Mortgages
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444' }}>
                    {formatCurrency(totalLoanDebt)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {accountsByCategory.loans.map(acc => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {acc.displayName}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {acc.institutionName ? `${acc.institutionName} • ` : ''}{acc.subtypeDisplay || acc.typeDisplay || 'Loan'} {acc.mask ? `(••${acc.mask})` : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Accounts Group */}
            {accountsByCategory.other.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  Other Accounts
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {accountsByCategory.other.map(acc => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontWeight: '600' }}>{acc.displayName}</span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {acc.typeDisplay || 'Other'}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        </div>

        {/* Right Column: Recent Transactions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Recent Transactions
            </h3>

            {/* Filter / Search Bar */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Filter transactions..."
                className="input-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem 0.3rem 2rem', height: 'auto' }}
              />
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              {searchTerm ? 'No transactions match your search.' : 'No recent transactions found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredTransactions.map(t => {
                const isIncome = t.amount < 0; // In Monarch schema, negative amounts are credits/income
                const displayAmount = Math.abs(t.amount);

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius)',
                      background: 'var(--muted)',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                        color: isIncome ? '#10b981' : 'var(--foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isIncome ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {t.merchantName}
                          </span>
                          {t.pending && (
                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: '600' }}>
                              Pending
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          {formatDate(t.date)} • {t.categoryName || 'General'}{t.accountName ? ` • ${t.accountName}` : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isIncome ? '#10b981' : 'var(--foreground)' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(displayAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
