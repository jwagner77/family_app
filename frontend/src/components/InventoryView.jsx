import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit2, RefreshCw, Calendar, AlertTriangle, Check, CheckSquare, ShoppingCart, Scan } from 'lucide-react';

const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry', 'Bakery', 'Frozen', 'Other'];

export default function InventoryView({ showToast, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkExpOpen, setIsBulkExpOpen] = useState(false);
  
  // Active item for edit
  const [editingItem, setEditingItem] = useState(null);

  // Form fields for Add/Edit
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [dateAdded, setDateAdded] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [percentageUsed, setPercentageUsed] = useState(0);
  const [sizeNumber, setSizeNumber] = useState('');
  const [sizeUnit, setSizeUnit] = useState('');

  // Bulk expiration date state
  const [bulkExpDate, setBulkExpDate] = useState('');

  // Debounced updates map to store timer references for inline sliders
  const debounceTimers = useRef({});

  // Barcode Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const zxingReaderInstance = useRef(null);

  // List Selector Modal States
  const [shoppingLists, setShoppingLists] = useState([]);
  const [isListPromptOpen, setIsListPromptOpen] = useState(false);
  const [itemToAddToShoppingList, setItemToAddToShoppingList] = useState(null);
  const [isBulkListPrompt, setIsBulkListPrompt] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');

  // Clean up timers and scanner on unmount
  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'inventory') {
        openAddModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
      Object.values(debounceTimers.current).forEach(clearTimeout);
      if (zxingReaderInstance.current) {
        zxingReaderInstance.current.reset();
      }
    };
  }, []);

  // Barcode Scanner Camera Lifecycle
  useEffect(() => {
    if (isScannerOpen) {
      // Small timeout to let the container render in DOM
      const timer = setTimeout(() => {
        if (!document.getElementById("barcode-scanner-video")) return;
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        zxingReaderInstance.current = codeReader;

        codeReader.listVideoInputDevices().then((videoInputDevices) => {
          let selectedDeviceId = null;
          // Try to find the back camera
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') || 
            device.label.toLowerCase().includes('rear')
          );
          
          if (backCamera) {
            selectedDeviceId = backCamera.deviceId;
          } else if (videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId;
          }

          codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            'barcode-scanner-video',
            (result, err) => {
              if (result) {
                handleBarcodeScanned(result.text);
              }
            }
          );
        }).catch(err => {
          console.error("Failed to start scanner:", err);
          showToast("Could not start camera. Please verify camera permissions.", "error");
          setIsScannerOpen(false);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (zxingReaderInstance.current) {
          zxingReaderInstance.current.reset();
          zxingReaderInstance.current = null;
        }
      };
    }
  }, [isScannerOpen]);

  const handleBarcodeScanned = async (barcode) => {
    if (zxingReaderInstance.current) {
      zxingReaderInstance.current.reset();
      zxingReaderInstance.current = null;
    }
    setIsScannerOpen(false);

    showToast(`Scanned barcode: ${barcode}. Looking up...`);
    
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`/api/inventory/lookup-barcode/${barcode}`, { headers });
      if (res.ok) {
        const data = await res.json();
        
        setTitle(data.title || barcode);
        setCategory(data.category || 'Other');
        setDateAdded(new Date().toISOString().split('T')[0]);
        setExpirationDate('');
        setPercentageUsed(0);
        setSizeNumber(data.size_number || '');
        setSizeUnit(data.size_unit || '');
        
        setIsAddOpen(true);
        showToast(`Found product (${data.source}): "${data.title}"`, 'success');
        return;
      }
    } catch (e) {
      console.error("Barcode lookup failed:", e);
    }
    
    // Fallback: Populate title with barcode and open add modal
    setTitle(`Barcode: ${barcode}`);
    setCategory('Other');
    setDateAdded(new Date().toISOString().split('T')[0]);
    setExpirationDate('');
    setPercentageUsed(0);
    setSizeNumber('');
    setSizeUnit('');
    setIsAddOpen(true);
    showToast(`Barcode not found. Please enter details manually.`, 'warning');
  };

  const handleAddToShoppingList = async (item) => {
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const listsRes = await fetch('/api/shopping-lists', { headers });
      if (!listsRes.ok) throw new Error('Failed to load shopping lists');
      const lists = await listsRes.json();
      
      if (lists.length === 0) {
        showToast('Creating a new shopping list first...');
        const createRes = await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My Shopping List' })
        });
        if (!createRes.ok) throw new Error('Failed to create shopping list');
        const newList = await createRes.json();
        lists.push({ id: newList.id, name: 'My Shopping List' });
      }

      setShoppingLists(lists);
      setSelectedListId(String(lists[0].id));
      setItemToAddToShoppingList(item);
      setIsBulkListPrompt(false);
      setIsListPromptOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkAddToShoppingList = async () => {
    if (selectedIds.length === 0) return;
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const listsRes = await fetch('/api/shopping-lists', { headers });
      if (!listsRes.ok) throw new Error('Failed to load shopping lists');
      const lists = await listsRes.json();
      
      if (lists.length === 0) {
        showToast('Creating a new shopping list first...');
        const createRes = await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My Shopping List' })
        });
        if (!createRes.ok) throw new Error('Failed to create shopping list');
        const newList = await createRes.json();
        lists.push({ id: newList.id, name: 'My Shopping List' });
      }

      setShoppingLists(lists);
      setSelectedListId(String(lists[0].id));
      setIsBulkListPrompt(true);
      setIsListPromptOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmAddToList = async (e) => {
    if (e) e.preventDefault();
    if (!selectedListId) return;
    
    setIsListPromptOpen(false);
    
    const targetList = shoppingLists.find(l => String(l.id) === selectedListId);
    const targetListName = targetList ? targetList.name : 'Shopping List';
    
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      
      if (isBulkListPrompt) {
        const selectedItems = items.filter(x => selectedIds.includes(x.id));
        let successCount = 0;
        for (const item of selectedItems) {
          const addRes = await fetch(`/api/shopping-lists/${selectedListId}/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: item.title,
              amount: item.size_number !== null ? String(item.size_number) : '1',
              unit: item.size_unit || '',
              category: item.category || 'Other',
              is_checked: 0
            })
          });
          if (addRes.ok) successCount++;
        }
        showToast(`Added ${successCount} item(s) to shopping list: "${targetListName}"`, 'success');
        setSelectedIds([]);
      } else {
        if (!itemToAddToShoppingList) return;
        const item = itemToAddToShoppingList;
        const addRes = await fetch(`/api/shopping-lists/${selectedListId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: item.title,
            amount: item.size_number !== null ? String(item.size_number) : '1',
            unit: item.size_unit || '',
            category: item.category || 'Other',
            is_checked: 0
          })
        });
        if (!addRes.ok) throw new Error('Failed to add item to shopping list');
        showToast(`Added "${item.title}" to shopping list: "${targetListName}"`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setItemToAddToShoppingList(null);
      setIsBulkListPrompt(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Check expiration status
  const getExpirationStatus = (expDateStr) => {
    if (!expDateStr) return { label: '', class: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = parseLocalDate(expDateStr);
    if (!expDate) return { label: '', class: '' };

    const diffTime = expDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', class: 'badge-danger' };
    } else if (diffDays === 0) {
      return { label: 'Expires today', class: 'badge-danger' };
    } else if (diffDays === 1) {
      return { label: 'Expires tomorrow', class: 'badge-warning' };
    } else if (diffDays <= 3) {
      return { label: `Expires in ${diffDays} days`, class: 'badge-warning' };
    } else if (diffDays <= 7) {
      return { label: `Expires in ${diffDays} days`, class: 'badge-info' };
    }
    return { label: `Expires ${formatDate(expDateStr)}`, class: 'badge-secondary' };
  };

  // Add inventory item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!title.trim() || !category) return;

    try {
      const payload = {
        title: title.trim(),
        category,
        date_added: dateAdded || new Date().toISOString().split('T')[0],
        expiration_date: expirationDate || null,
        percentage_used: Number(percentageUsed),
        size_number: sizeNumber !== '' ? Number(sizeNumber) : null,
        size_unit: sizeUnit.trim() || null
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create inventory item');
      showToast(`Added manual item: ${payload.title}`);
      setIsAddOpen(false);
      resetForm();
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Save edited inventory item
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !title.trim()) return;

    try {
      const payload = {
        title: title.trim(),
        category,
        date_added: dateAdded,
        expiration_date: expirationDate || null,
        percentage_used: Number(percentageUsed),
        size_number: sizeNumber !== '' ? Number(sizeNumber) : null,
        size_unit: sizeUnit.trim() || null
      };

      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update inventory item');
      showToast(`Updated item: ${payload.title}`);
      setIsEditOpen(false);
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete single item
  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast(`Deleted "${name}"`);
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle selection for bulk actions
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle all items in a category
  const handleToggleCategory = (categoryItems) => {
    const itemIds = categoryItems.map(item => item.id);
    const allSelected = itemIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return;

    try {
      const res = await fetch('/api/inventory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!res.ok) throw new Error('Failed to perform bulk delete');
      showToast(`Successfully deleted ${selectedIds.length} items`);
      setSelectedIds([]);
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Bulk mark consumed (100% used)
  const handleBulkMarkConsumed = async () => {
    if (!window.confirm(`Mark ${selectedIds.length} items as consumed? (Remaining percentage will set to 0%)`)) return;

    try {
      const res = await fetch('/api/inventory/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          updates: { percentage_used: 100 }
        })
      });

      if (!res.ok) throw new Error('Failed to perform bulk update');
      showToast(`Marked ${selectedIds.length} items as consumed.`);
      setSelectedIds([]);
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Bulk update expiration date
  const handleBulkSetExpiration = async (e) => {
    e.preventDefault();
    if (!bulkExpDate) return;

    try {
      const res = await fetch('/api/inventory/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          updates: { expiration_date: bulkExpDate }
        })
      });

      if (!res.ok) throw new Error('Failed to perform bulk update');
      showToast(`Set expiration date for ${selectedIds.length} items.`);
      setIsBulkExpOpen(false);
      setBulkExpDate('');
      setSelectedIds([]);
      fetchInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Inline slider changes
  const handleSliderChange = (item, newRemaining) => {
    const newUsed = 100 - newRemaining;
    
    // Update local state instantly so slider is responsive
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, percentage_used: newUsed } : x));
    
    // Debounce the database update API call
    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id]);
    }
    
    debounceTimers.current[item.id] = setTimeout(async () => {
      try {
        const payload = {
          title: item.title,
          category: item.category,
          date_added: item.date_added,
          expiration_date: item.expiration_date,
          percentage_used: newUsed,
          size_number: item.size_number,
          size_unit: item.size_unit
        };

        const res = await fetch(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed inline update');
      } catch (err) {
        console.error('Failed to sync inline slider:', err);
      }
    }, 500); // 500ms debounce
  };

  const openAddModal = () => {
    resetForm();
    setDateAdded(new Date().toISOString().split('T')[0]);
    setIsAddOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setDateAdded(item.date_added);
    setExpirationDate(item.expiration_date || '');
    setPercentageUsed(item.percentage_used);
    setSizeNumber(item.size_number !== null ? String(item.size_number) : '');
    setSizeUnit(item.size_unit || '');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Other');
    setDateAdded('');
    setExpirationDate('');
    setPercentageUsed(0);
    setSizeNumber('');
    setSizeUnit('');
  };

  // Group items by category
  const groupedItems = {};
  CATEGORIES.forEach(cat => {
    groupedItems[cat] = [];
  });
  
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (groupedItems[cat]) {
      groupedItems[cat].push(item);
    } else {
      groupedItems['Other'].push(item);
    }
  });

  return (
    <div className="animate-fade-in print-area" style={{ position: 'relative', paddingBottom: selectedIds.length > 0 ? '5rem' : '1rem' }}>
      <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Kitchen Inventory</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }} className="no-print">
          <button className="btn btn-outline" onClick={fetchInventory} disabled={loading}>
            <RefreshCw size={18} /> Reload
          </button>
          {user?.permissions?.shopping_list !== 'none' && (
            <button className="btn btn-outline" onClick={() => setIsScannerOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Scan size={18} /> Scan Barcode
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <RefreshCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading inventory...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Package size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.6 }} />
          <h3>No Inventory Items Available</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Check off items on your shopping list, or click "Add Item" above to manually stock your kitchen.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
          {CATEGORIES.map(category => {
            const categoryItems = groupedItems[category];
            if (categoryItems.length === 0) return null;

            const allCatSelected = categoryItems.every(item => selectedIds.includes(item.id));
            
            return (
              <div key={category}>
                <h3 
                  style={{ 
                    fontSize: '1.15rem', 
                    marginBottom: '0.85rem', 
                    borderBottom: '2px solid var(--border-color)', 
                    paddingBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline no-print" 
                      style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleToggleCategory(categoryItems)}
                      title="Select all in department"
                    >
                      <CheckSquare size={16} style={{ color: allCatSelected ? 'var(--primary)' : 'var(--text-muted)' }} />
                    </button>
                    <span>{category}</span>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        background: 'var(--primary-light)', 
                        color: 'var(--primary)', 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '100px', 
                        fontWeight: '700' 
                      }}
                    >
                      {categoryItems.length}
                    </span>
                  </div>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {categoryItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const remaining = 100 - item.percentage_used;
                    const expStatus = getExpirationStatus(item.expiration_date);

                    return (
                      <div 
                        key={item.id}
                        className={`shopping-list-item ${remaining === 0 ? 'checked' : ''}`}
                        style={{ cursor: 'default', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem' }}
                      >
                        {/* Checkbox */}
                        <div 
                          className="no-print"
                          onClick={() => handleToggleSelect(item.id)}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <span 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`, 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              transition: 'all 0.1s ease',
                              color: '#ffffff'
                            }}
                          >
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </span>
                        </div>

                        {/* Title and Size */}
                        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                          <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.size_number !== null ? `${item.size_number} ` : ''}{item.size_unit || ''}
                            {item.size_number !== null || item.size_unit ? ' • ' : ''}
                            Added {formatDate(item.date_added)}
                          </div>
                        </div>

                        {/* Expiration Date Badge */}
                        <div style={{ flex: '0 1 180px', minWidth: '120px' }}>
                          {item.expiration_date ? (
                            <span className={`badge ${expStatus.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}>
                              <Calendar size={12} />
                              <span>{expStatus.label}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No expiration</span>
                          )}
                        </div>

                        {/* Slider for Percentage Remaining */}
                        <div style={{ flex: '1 1 250px', minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="no-print">
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', width: '90px', display: 'inline-block', textAlign: 'right' }}>
                            {remaining}% left
                          </span>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={remaining}
                            onChange={(e) => handleSliderChange(item, parseInt(e.target.value))}
                            style={{ 
                              flex: 1, 
                              accentColor: remaining === 0 ? 'var(--text-muted)' : remaining <= 20 ? 'var(--danger)' : 'var(--primary)',
                              cursor: 'pointer',
                              height: '6px',
                              borderRadius: '100px',
                              background: 'var(--border-color)',
                              outline: 'none'
                            }}
                          />
                        </div>

                        {/* Print Only Percentage */}
                        <div className="print-only" style={{ display: 'none' }}>
                          {remaining}% Remaining
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }} className="no-print">
                          {user?.permissions?.shopping_list !== 'none' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.5rem', border: 'none', background: 'transparent' }} 
                              onClick={() => handleAddToShoppingList(item)}
                              title="Add to Shopping List"
                            >
                              <ShoppingCart size={16} style={{ color: 'var(--primary)' }} />
                            </button>
                          )}
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.5rem', border: 'none', background: 'transparent' }} 
                            onClick={() => openEditModal(item)}
                            title="Edit details"
                          >
                            <Edit2 size={16} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.5rem', border: 'none', background: 'transparent' }} 
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            title="Delete item"
                          >
                            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div 
          className="no-print animate-slide-up"
          style={{ 
            position: 'fixed', 
            bottom: '1.5rem', 
            left: 'calc(50% + var(--sidebar-offset, 280px) / 2)', 
            transform: 'translateX(-50%)', 
            background: 'var(--bg-card)', 
            border: '2px solid var(--primary)', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            padding: '0.85rem 1.75rem', 
            zIndex: 1000,
            width: 'calc(100% - var(--sidebar-offset, 280px) - 40px)',
            maxWidth: '800px',
            transition: 'left var(--transition-normal), width var(--transition-normal)'
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => setSelectedIds([])}>
              Cancel
            </button>
            {user?.permissions?.shopping_list !== 'none' && (
              <button 
                className="btn btn-outline" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }} 
                onClick={handleBulkAddToShoppingList}
              >
                <ShoppingCart size={14} /> Add to List
              </button>
            )}
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={handleBulkMarkConsumed}>
              Mark Consumed
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-flex', gap: '0.25rem' }} onClick={() => setIsBulkExpOpen(true)}>
              <Calendar size={14} /> Exp. Date
            </button>
            <button className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-flex', gap: '0.25rem' }} onClick={handleBulkDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Inventory Item</h2>
              <button className="close-btn" onClick={() => setIsAddOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="add-title">Item Title *</label>
                  <input 
                    id="add-title"
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Ground Beef" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-category">Department/Category *</label>
                  <select 
                    id="add-category"
                    className="input-control" 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="add-size-num">Size (Number)</label>
                    <input 
                      id="add-size-num"
                      type="number" 
                      step="any"
                      placeholder="e.g. 16"
                      className="input-control" 
                      value={sizeNumber}
                      onChange={(e) => setSizeNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="add-size-unit">Size Unit (Measurement)</label>
                    <input 
                      id="add-size-unit"
                      type="text" 
                      placeholder="e.g. oz, lbs, pack"
                      className="input-control" 
                      value={sizeUnit}
                      onChange={(e) => setSizeUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="add-date-added">Date Added</label>
                    <input 
                      id="add-date-added"
                      type="date" 
                      className="input-control" 
                      value={dateAdded}
                      onChange={(e) => setDateAdded(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="add-date-exp">Expiration Date</label>
                    <input 
                      id="add-date-exp"
                      type="date" 
                      className="input-control" 
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="add-percent">Percentage Used ({percentageUsed}% used, {100 - percentageUsed}% left)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      id="add-percent"
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={percentageUsed}
                      onChange={(e) => setPercentageUsed(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontWeight: 'bold', width: '50px' }}>{percentageUsed}%</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add to Inventory</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditOpen(false); setEditingItem(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Edit Inventory Item</h3>
              <button className="close-btn" onClick={() => { setIsEditOpen(false); setEditingItem(null); }}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="edit-title">Item Title *</label>
                  <input 
                    id="edit-title"
                    type="text" 
                    className="input-control" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-category">Department/Category *</label>
                  <select 
                    id="edit-category"
                    className="input-control" 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="edit-size-num">Size (Number)</label>
                    <input 
                      id="edit-size-num"
                      type="number" 
                      step="any"
                      placeholder="e.g. 16"
                      className="input-control" 
                      value={sizeNumber}
                      onChange={(e) => setSizeNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-size-unit">Size Unit (Measurement)</label>
                    <input 
                      id="edit-size-unit"
                      type="text" 
                      placeholder="e.g. oz, lbs, pack"
                      className="input-control" 
                      value={sizeUnit}
                      onChange={(e) => setSizeUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="edit-date-added">Date Added</label>
                    <input 
                      id="edit-date-added"
                      type="date" 
                      className="input-control" 
                      value={dateAdded}
                      onChange={(e) => setDateAdded(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-date-exp">Expiration Date</label>
                    <input 
                      id="edit-date-exp"
                      type="date" 
                      className="input-control" 
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-percent">Percentage Used ({percentageUsed}% used, {100 - percentageUsed}% left)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      id="edit-percent"
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={percentageUsed}
                      onChange={(e) => setPercentageUsed(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontWeight: 'bold', width: '50px' }}>{percentageUsed}%</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Expiration Date Modal */}
      {isBulkExpOpen && (
        <div className="modal-overlay" onClick={() => setIsBulkExpOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Set Expiration Date</h3>
              <button className="close-btn" onClick={() => setIsBulkExpOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleBulkSetExpiration} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="bulk-exp-date">Common Expiration Date *</label>
                  <input 
                    id="bulk-exp-date"
                    type="date" 
                    className="input-control" 
                    value={bulkExpDate}
                    onChange={(e) => setBulkExpDate(e.target.value)}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Apply Expiration Date
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Barcode Scanner Modal overlay */}
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Scan Barcode</h3>
              <button className="close-btn" onClick={() => setIsScannerOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Center the barcode in the scanner box below to scan.
              </p>
              <div 
                style={{ 
                  width: '100%', 
                  maxWidth: '350px', 
                  height: '250px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  border: '2px solid var(--primary)',
                  background: '#000',
                  position: 'relative'
                }} 
              >
                <video 
                  id="barcode-scanner-video" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                  muted
                  playsInline
                />
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsScannerOpen(false)}
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Selector Prompt Modal */}
      {isListPromptOpen && (
        <div className="modal-overlay" onClick={() => setIsListPromptOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                {isBulkListPrompt ? 'Add Items to List' : `Add "${itemToAddToShoppingList?.title}" to List`}
              </h3>
              <button className="close-btn" onClick={() => setIsListPromptOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleConfirmAddToList} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="inventory-list-select">Select Shopping List</label>
                  <select 
                    id="inventory-list-select" 
                    name="listId" 
                    className="input-control" 
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                  >
                    {shoppingLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Confirm Add
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-warning {
          background: rgba(243, 156, 18, 0.15);
          color: #f39c12;
          border: 1px solid rgba(243, 156, 18, 0.3);
        }
        .badge-info {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .badge-secondary {
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid rgba(211, 84, 0, 0.15);
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media (max-width: 768px) {
          #inventory-bulk-bar {
            width: calc(100% - 2rem) !important;
          }
        }
      `}</style>
    </div>
  );
}
