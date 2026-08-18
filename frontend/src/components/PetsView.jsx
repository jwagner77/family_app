import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Activity, 
  Heart, 
  Clipboard, 
  Upload, 
  Pill, 
  Clock, 
  Info,
  Check,
  X,
  User,
  HeartPulse
} from 'lucide-react';

export default function PetsView({ showToast }) {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'visits', 'medications'
  const [loading, setLoading] = useState(true);

  // Pet Modals & Form
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [petModalMode, setPetModalMode] = useState('add'); // 'add', 'edit'
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('Dog');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthdate, setPetBirthdate] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petNotes, setPetNotes] = useState('');
  const [petImageFile, setPetImageFile] = useState(null);
  const [petImagePreview, setPetImagePreview] = useState('');

  // Vet Visits states
  const [vetVisits, setVetVisits] = useState([]);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitProvider, setVisitProvider] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [visitWeight, setVisitWeight] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Pet Meds states
  const [meds, setMeds] = useState([]);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (!selectedPet || activeTab === 'overview') {
      window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { label: 'Add Pet Profile', visible: true } }));
    } else {
      if (activeTab === 'visits') {
        window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { label: 'Log Vet Visit', visible: true } }));
      } else if (activeTab === 'medications') {
        window.dispatchEvent(new CustomEvent('update-fab-action', { detail: { label: 'Add Medication', visible: true } }));
      }
    }
  }, [selectedPet, activeTab]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'pets') {
        if (!selectedPet || activeTab === 'overview') {
          handleOpenAddPet();
        } else {
          if (activeTab === 'visits') {
            handleOpenAddVisit();
          } else if (activeTab === 'medications') {
            handleOpenAddMed();
          }
        }
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, [selectedPet, activeTab]);

  useEffect(() => {
    if (selectedPet) {
      fetchVetVisits(selectedPet.id);
      fetchMedications(selectedPet.id);
    } else {
      setVetVisits([]);
      setMeds([]);
    }
  }, [selectedPet]);

  const fetchPets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pets');
      if (res.ok) {
        const data = await res.json();
        setPets(data);
        if (data.length > 0 && !selectedPet) {
          setSelectedPet(data[0]);
        } else if (data.length > 0 && selectedPet) {
          // keep selected pet updated
          const updated = data.find(p => p.id === selectedPet.id);
          setSelectedPet(updated || data[0]);
        } else {
          setSelectedPet(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVetVisits = async (petId) => {
    try {
      const res = await fetch(`/api/pets/${petId}/vet-visits`);
      if (res.ok) {
        const data = await res.json();
        setVetVisits(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMedications = async (petId) => {
    try {
      const res = await fetch(`/api/pets/${petId}/medications`);
      if (res.ok) {
        const data = await res.json();
        setMeds(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- PET CRUD ---
  const handleOpenAddPet = () => {
    setPetModalMode('add');
    setPetName('');
    setPetType('Dog');
    setPetBreed('');
    setPetBirthdate('');
    setPetWeight('');
    setPetNotes('');
    setPetImageFile(null);
    setPetImagePreview('');
    setIsPetModalOpen(true);
  };

  const handleOpenEditPet = (pet) => {
    setPetModalMode('edit');
    setPetName(pet.name);
    setPetType(pet.type || 'Dog');
    setPetBreed(pet.breed || '');
    setPetBirthdate(pet.birthdate || '');
    setPetWeight(pet.weight ? String(pet.weight) : '');
    setPetNotes(pet.notes || '');
    setPetImageFile(null);
    setPetImagePreview(pet.picture_url || '');
    setIsPetModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPetImageFile(file);
      setPetImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSavePet = async (e) => {
    e.preventDefault();
    if (!petName.trim()) {
      showToast('Pet name is required', 'error');
      return;
    }

    const petData = {
      name: petName,
      type: petType,
      breed: petBreed,
      birthdate: petBirthdate,
      weight: petWeight !== '' ? Number(petWeight) : null,
      notes: petNotes,
      keepExistingPicture: petModalMode === 'edit' && petImagePreview !== '' && !petImageFile
    };

    const formData = new FormData();
    formData.append('pet', JSON.stringify(petData));
    if (petImageFile) {
      formData.append('picture', petImageFile);
    }

    try {
      let res;
      if (petModalMode === 'add') {
        res = await fetch('/api/pets', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch(`/api/pets/${selectedPet.id}`, {
          method: 'PUT',
          body: formData
        });
      }

      if (res.ok) {
        const savedPet = await res.json();
        showToast(petModalMode === 'add' ? `${petName} added successfully!` : 'Pet updated successfully!', 'success');
        setIsPetModalOpen(false);
        await fetchPets();
        if (petModalMode === 'add') {
          setSelectedPet(savedPet);
        }
      } else {
        showToast('Failed to save pet details', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving pet details', 'error');
    }
  };

  const handleDeletePet = async (pet) => {
    if (!window.confirm(`Are you sure you want to delete ${pet.name}?`)) return;
    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`${pet.name} deleted successfully!`, 'success');
        setSelectedPet(null);
        fetchPets();
      } else {
        showToast('Failed to delete pet', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting pet', 'error');
    }
  };

  // --- VET VISIT CRUD ---
  const handleOpenAddVisit = () => {
    setVisitDate(new Date().toLocaleDateString('sv'));
    setVisitProvider('');
    setVisitReason('');
    setVisitWeight('');
    setVisitNotes('');
    setIsVisitModalOpen(true);
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!visitDate) {
      showToast('Visit date is required', 'error');
      return;
    }
    const payload = {
      visit_date: visitDate,
      provider: visitProvider,
      reason: visitReason,
      weight_logged: visitWeight !== '' ? Number(visitWeight) : null,
      notes: visitNotes
    };
    try {
      const res = await fetch(`/api/pets/${selectedPet.id}/vet-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Vet visit logged successfully!', 'success');
        setIsVisitModalOpen(false);
        fetchVetVisits(selectedPet.id);
        fetchPets(); // Re-fetch to update pet's latest weight!
      } else {
        showToast('Failed to save vet visit', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving vet visit', 'error');
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vet visit?')) return;
    try {
      const res = await fetch(`/api/pets/vet-visits/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Vet visit deleted successfully!', 'success');
        fetchVetVisits(selectedPet.id);
      } else {
        showToast('Failed to delete vet visit', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting vet visit', 'error');
    }
  };

  // --- MEDICATION CRUD ---
  const handleOpenAddMed = () => {
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedInstructions('');
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
      instructions: medInstructions
    };
    try {
      const res = await fetch(`/api/pets/${selectedPet.id}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Medication added successfully!', 'success');
        setIsMedModalOpen(false);
        fetchMedications(selectedPet.id);
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
      const res = await fetch(`/api/pets/medications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Medication deleted successfully!', 'success');
        fetchMedications(selectedPet.id);
      } else {
        showToast('Failed to delete medication', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting medication', 'error');
    }
  };

  const handleLogMedGiven = async (medId) => {
    try {
      const res = await fetch(`/api/pets/medications/${medId}/log`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Medication log administration recorded!', 'success');
        fetchMedications(selectedPet.id);
      } else {
        showToast('Failed to log medication', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- STATS HELPER ---
  const calculateAge = (birthdate) => {
    if (!birthdate) return 'Unknown';
    const bdate = new Date(birthdate + 'T00:00:00');
    const today = new Date();
    let age = today.getFullYear() - bdate.getFullYear();
    const m = today.getMonth() - bdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) {
      age--;
    }
    
    if (age < 1) {
      // Calculate age in months
      const months = (today.getFullYear() - bdate.getFullYear()) * 12 + (today.getMonth() - bdate.getMonth());
      return months <= 1 ? '1 month' : `${months} months`;
    }
    return age === 1 ? '1 year' : `${age} years`;
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Never';
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' @ ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
          Pets Directory
        </h2>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <div className="animate-spin" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : pets.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* PETS SIDEBAR PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pets.map(pet => (
              <div 
                key={pet.id} 
                className={`card hover-lift`} 
                onClick={() => setSelectedPet(pet)}
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer', 
                  borderColor: selectedPet?.id === pet.id ? 'var(--primary)' : 'var(--border)',
                  background: selectedPet?.id === pet.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                {pet.picture_url ? (
                  <img 
                    src={pet.picture_url} 
                    alt={pet.name} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {pet.name[0]}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontWeight: '700', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pet.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pet.type} {pet.breed ? `• ${pet.breed}` : ''}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SELECTED PET DETAIL VIEW */}
          {selectedPet && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Pet Profile Header Card */}
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                {selectedPet.picture_url ? (
                  <img 
                    src={selectedPet.picture_url} 
                    alt={selectedPet.name} 
                    style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '3px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '2.5rem' }}>
                    {selectedPet.name[0]}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>{selectedPet.name}</h3>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedPet.type} {selectedPet.breed ? `• ${selectedPet.breed}` : ''}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ minWidth: 'auto', padding: '0.35rem 0.6rem', height: 'auto', fontSize: '0.8125rem' }} onClick={() => handleOpenEditPet(selectedPet)}>
                        <Edit2 size={13} style={{ marginRight: '0.25rem' }} /> Edit
                      </button>
                      <button className="btn btn-danger" style={{ minWidth: 'auto', padding: '0.35rem 0.6rem', height: 'auto', fontSize: '0.8125rem' }} onClick={() => handleDeletePet(selectedPet)}>
                        <Trash2 size={13} style={{ marginRight: '0.25rem' }} /> Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>AGE</span>
                      <span style={{ fontSize: '0.9375rem', fontWeight: '700' }}>{calculateAge(selectedPet.birthdate)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>WEIGHT</span>
                      <span style={{ fontSize: '0.9375rem', fontWeight: '700' }}>{selectedPet.weight ? `${selectedPet.weight} lbs` : 'Unknown'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>BIRTHDATE</span>
                      <span style={{ fontSize: '0.9375rem', fontWeight: '700' }}>
                        {selectedPet.birthdate ? new Date(selectedPet.birthdate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtabs for Detail view */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <button 
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  Overview & Notes
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`}
                  onClick={() => setActiveTab('visits')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: activeTab === 'visits' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === 'visits' ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  Vet Visits ({vetVisits.length})
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'medications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('medications')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: activeTab === 'medications' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === 'medications' ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  Medications ({meds.length})
                </button>
              </div>

              {/* DETAIL CONTENT: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>Notes & Instructions</h4>
                  {selectedPet.notes ? (
                    <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {selectedPet.notes}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                      No notes logged for {selectedPet.name}. Edit details to add dietary preferences, allergins, or registration info.
                    </p>
                  )}
                </div>
              )}

              {/* DETAIL CONTENT: VET VISITS */}
              {activeTab === 'visits' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>Vet Visit History</h4>
                  </div>

                  {vetVisits.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {vetVisits.map(visit => (
                        <div key={visit.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '0.9375rem' }}>{visit.reason || 'Checkup'}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.125rem' }}>
                                {visit.provider && `${visit.provider} • `}
                                {new Date(visit.visit_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {visit.weight_logged && (
                                <span style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
                                  ⚖️ {visit.weight_logged} lbs
                                </span>
                              )}
                              <button className="btn btn-danger" style={{ minWidth: 'auto', padding: '0.25rem 0.4rem', height: 'auto' }} onClick={() => handleDeleteVisit(visit.id)}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          {visit.notes && (
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                              {visit.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No veterinary clinic visits logged yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* DETAIL CONTENT: MEDICATIONS */}
              {activeTab === 'medications' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>Pet Prescription Schedule</h4>
                  </div>

                  {meds.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                      {meds.map(med => (
                        <div key={med.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h5 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{med.name}</h5>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.dosage} {med.frequency ? `• ${med.frequency}` : ''}</span>
                            </div>
                            <button className="btn btn-danger" style={{ minWidth: 'auto', padding: '0.25rem 0.4rem', height: 'auto' }} onClick={() => handleDeleteMed(med.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {med.instructions && (
                            <p style={{ margin: 0, fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                              "{med.instructions}"
                            </p>
                          )}

                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>LAST GIVEN</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatDateTime(med.last_given)}</span>
                            </div>
                            
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.3rem 0.6rem', minWidth: 'auto', height: 'auto', fontSize: '0.75rem', gap: '0.25rem' }} 
                              onClick={() => handleLogMedGiven(med.id)}
                            >
                              <Pill size={11} /> Log Given
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No prescriptions active for {selectedPet.name}.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <HeartPulse size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '1.25rem', color: 'var(--text-main)' }}>Welcome to your Pets Directory</h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9375rem' }}>You don't have any pets registered yet. Add a pet to track weights, veterinarian wellness history, and medications.</p>
          <button className="btn btn-primary" onClick={handleOpenAddPet} style={{ gap: '0.5rem' }}>
            <Plus size={16} /> Register Your First Pet
          </button>
        </div>
      )}

      {/* PET MODAL (ADD / EDIT) */}
      {isPetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPetModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{petModalMode === 'add' ? 'Add New Pet' : `Edit ${petName}`}</h2>
              <button className="close-btn" onClick={() => setIsPetModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">

            <form onSubmit={handleSavePet} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              
              {/* Image Upload section */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {petImagePreview ? (
                  <img 
                    src={petImagePreview} 
                    alt="Preview" 
                    style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <User size={32} />
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="pet-pic" className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.35rem 0.65rem', height: 'auto', minWidth: 'auto', fontSize: '0.8125rem', gap: '0.35rem' }}>
                    <Upload size={14} /> Upload Picture
                  </label>
                  <input 
                    id="pet-pic" 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Supports JPG, PNG (Max 5MB)</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pet-name">Pet Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="pet-name"
                  type="text"
                  className="input-control"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Charlie"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="pet-type">Pet Type</label>
                  <select
                    id="pet-type"
                    className="input-control"
                    value={petType}
                    onChange={(e) => setPetType(e.target.value)}
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Reptile">Reptile</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="pet-breed">Breed</label>
                  <input
                    id="pet-breed"
                    type="text"
                    className="input-control"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="pet-birth">Birthdate</label>
                  <input
                    id="pet-birth"
                    type="date"
                    className="input-control"
                    value={petBirthdate}
                    onChange={(e) => setPetBirthdate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pet-weight">Weight (lbs)</label>
                  <input
                    id="pet-weight"
                    type="number"
                    step="0.1"
                    className="input-control"
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    placeholder="e.g. 45.2"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pet-notes">General Info / Notes</label>
                <textarea
                  id="pet-notes"
                  className="input-control"
                  rows="3"
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  placeholder="Dietary details, microchip id, behavior warnings..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsPetModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '0.25rem' }}><Check size={16} /> Save</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* VET VISIT MODAL */}
      {isVisitModalOpen && (
        <div className="modal-overlay" onClick={() => setIsVisitModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Vet Visit</h2>
              <button className="close-btn" onClick={() => setIsVisitModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">

            <form onSubmit={handleSaveVisit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label htmlFor="visit-date">Visit Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="visit-date"
                  type="date"
                  className="input-control"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="visit-provider">Veterinarian / Clinic</label>
                <input
                  id="visit-provider"
                  type="text"
                  className="input-control"
                  value={visitProvider}
                  onChange={(e) => setVisitProvider(e.target.value)}
                  placeholder="e.g. Maple Valley Animal Hospital"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="visit-reason">Reason for Visit</label>
                  <input
                    id="visit-reason"
                    type="text"
                    className="input-control"
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value)}
                    placeholder="e.g. Annual Rabies Vaccine"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="visit-weight">Weight Logged (lbs)</label>
                  <input
                    id="visit-weight"
                    type="number"
                    step="0.1"
                    className="input-control"
                    value={visitWeight}
                    onChange={(e) => setVisitWeight(e.target.value)}
                    placeholder="Update latest weight..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="visit-notes">Doctor Notes / Diagnosis</label>
                <textarea
                  id="visit-notes"
                  className="input-control"
                  rows="3"
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Vaccines given, tests ran, prescribed medications..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsVisitModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '0.25rem' }}><Check size={16} /> Save</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* MEDICATION MODAL */}
      {isMedModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMedModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Pet Medication</h2>
              <button className="close-btn" onClick={() => setIsMedModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">

            <form onSubmit={handleSaveMed} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label htmlFor="pet-med-name">Medication Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="pet-med-name"
                  type="text"
                  className="input-control"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Heartgard Plus"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="pet-med-dosage">Dosage</label>
                  <input
                    id="pet-med-dosage"
                    type="text"
                    className="input-control"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 1 chewable tablet"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pet-med-freq">Frequency</label>
                  <input
                    id="pet-med-freq"
                    type="text"
                    className="input-control"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    placeholder="e.g. Monthly, Daily"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pet-med-inst">Instructions</label>
                <textarea
                  id="pet-med-inst"
                  className="input-control"
                  rows="2"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="Take with food, chew thoroughly, etc..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsMedModalOpen(false)}>Cancel</button>
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
