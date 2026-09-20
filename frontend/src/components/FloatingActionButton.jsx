import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const TAB_ACTIONS = {
  contacts: 'Add Contact',
  housekeeping: 'Add Chore',
  todo: 'Add Task',
  focus_areas: 'Add Focus Area',
  routines: 'Add Routine',
  habits: 'Add Habit',
  calendar: 'Add Event',
  subscriptions: 'Add Subscription',
  bills: 'Add Bill',
  recipes: 'Add Recipe',
  leftovers: 'Add Leftover',
  inventory: 'Add Item',
  shopping: 'Add Shopping Item',
  library: 'Add Book',
  reading_list: 'Add Book',
  reading_log: 'Add Log Entry',
  features: 'Submit Feature Request',
  bugs: 'Submit Bug Report',
  pets: 'Add Pet Profile',
  games: 'Add Game'
};

export default function FloatingActionButton({ activeTab }) {
  const [hovered, setHovered] = useState(false);
  const [customAction, setCustomAction] = useState(null);
  const [prevTab, setPrevTab] = useState(activeTab);
  const [hasModalOpen, setHasModalOpen] = useState(false);

  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    setCustomAction(null);
  }

  useEffect(() => {
    const handleUpdate = (e) => {
      setCustomAction(e.detail);
    };
    window.addEventListener('update-fab-action', handleUpdate);
    return () => {
      window.removeEventListener('update-fab-action', handleUpdate);
    };
  }, []);

  // Automatically detect if any modal is open and hide the FAB
  useEffect(() => {
    const checkModal = () => {
      const openModal = document.querySelector('.modal-overlay:not(.closing)');
      setHasModalOpen(!!openModal);
    };

    checkModal();
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const actionLabel = customAction?.label !== undefined ? customAction.label : TAB_ACTIONS[activeTab];
  const isVisible = customAction?.visible !== undefined ? customAction.visible : !!TAB_ACTIONS[activeTab];

  if (!isVisible || !actionLabel || hasModalOpen) return null;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('trigger-add-action', { detail: { tab: activeTab } }));
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '2.5rem',
        right: '2.5rem',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        pointerEvents: 'none'
      }}
    >
      {hovered && (
        <div 
          style={{
            backgroundColor: 'var(--popover)',
            color: 'var(--popover-foreground)',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap',
            animation: 'fadeIn 0.15s ease-out forwards',
            pointerEvents: 'auto'
          }}
        >
          {actionLabel}
        </div>
      )}
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s',
          pointerEvents: 'auto',
          transform: hovered ? 'scale(1.1)' : 'scale(1)'
        }}
        title={actionLabel}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
