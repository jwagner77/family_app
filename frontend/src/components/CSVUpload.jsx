import React, { useState } from 'react';
import { FileText, Upload, RefreshCw, Info, HelpCircle, Download } from 'lucide-react';

export default function CSVUpload({ showToast, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleDownloadTemplate = () => {
    const headers = ['title', 'description', 'prep_time', 'cook_time', 'servings', 'ingredients', 'instructions'];
    const exampleRow = [
      'Grandma\'s Lasagna',
      'Rich and cheesy traditional lasagna',
      '30',
      '60',
      '8',
      '1 lb lasagna noodles; 1 lb ground beef; 2 cups ricotta cheese; 2 cups mozzarella cheese; 4 cups marinara sauce',
      'Boil noodles; Cook beef and mix with sauce; Layer noodles, cheese, and meat sauce in baking dish; Bake at 375F for 45 minutes'
    ];
    
    const escapeCSV = (str) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      headers.map(escapeCSV).join(','),
      exampleRow.map(escapeCSV).join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'recipe_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processSelectedFile(selectedFile);
  };

  const processSelectedFile = (selectedFile) => {
    if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv')) {
      setFile(selectedFile);
    } else {
      showToast('Please select a valid CSV file.', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    processSelectedFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('csvfile', file);

    try {
      const res = await fetch('/api/recipes/csv', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload CSV');
      }

      const data = await res.json();
      showToast(data.message || 'Recipes imported successfully!');
      onImportSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
      <div className="content-header">
        <h2>CSV Recipe Batch Import</h2>
      </div>

      {/* Upload Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Upload CSV File</h3>
          <button 
            type="button"
            className="btn btn-outline" 
            style={{ padding: '0.4rem', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setIsGuideOpen(true)}
            title="View CSV Format Guide"
          >
            <HelpCircle size={22} style={{ color: 'var(--primary)' }} />
          </button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Upload a spreadsheet containing recipe details. Each row represents a single recipe that will be automatically added to your database.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ fontSize: '0.85rem', width: '100%', gap: '0.5rem', justifyContent: 'center' }}
            onClick={handleDownloadTemplate}
          >
            <Download size={16} style={{ color: 'var(--primary)' }} /> Download CSV Template
          </button>
        </div>

        {!file ? (
          <div 
            className="upload-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-input').click()}
            style={{ padding: '4rem 2rem' }}
          >
            <FileText size={36} style={{ color: 'var(--primary)' }} />
            <div>
              <strong>Click to select CSV</strong> or drag & drop here
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports standard .csv text files</span>
            <input 
              type="file" 
              id="csv-input" 
              accept=".csv,text/csv" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '1.25rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-sm)', 
                width: '100%', 
                background: 'var(--bg-app)' 
              }}
            >
              <FileText size={32} style={{ color: 'var(--primary)' }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <strong>{file.name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setFile(null)} 
                style={{ fontSize: '1.5rem' }}
                disabled={loading}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setFile(null)} 
                style={{ flex: 1 }} 
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpload} 
                style={{ flex: 1.5 }} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="spinner" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Import Recipes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format Guide Modal overlay */}
      {isGuideOpen && (
        <div className="modal-overlay" onClick={() => setIsGuideOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', margin: 0 }}>
                <Info size={20} style={{ color: 'var(--primary)' }} /> CSV Format Guide
              </h3>
              <button className="close-btn" onClick={() => setIsGuideOpen(false)} style={{ fontSize: '1.5rem' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Your CSV file must include header columns exactly as named below. Separate multiple lines in the Ingredients or Instructions columns with a **semicolon (;)**.
              </p>

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ fontSize: '0.8rem', border: '1px solid var(--border-color)', borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>Column Header</th>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>Example Format / Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>title</td>
                      <td style={{ padding: '0.6rem' }}>Beef Tacos <span style={{ color: 'var(--text-muted)' }}>(Required)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>description</td>
                      <td style={{ padding: '0.6rem' }}>Classic family taco night... <span style={{ color: 'var(--text-muted)' }}>(Optional)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>prep_time</td>
                      <td style={{ padding: '0.6rem' }}>10 <span style={{ color: 'var(--text-muted)' }}>(Optional, integer minutes)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>cook_time</td>
                      <td style={{ padding: '0.6rem' }}>15 <span style={{ color: 'var(--text-muted)' }}>(Optional, integer minutes)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>servings</td>
                      <td style={{ padding: '0.6rem' }}>4 <span style={{ color: 'var(--text-muted)' }}>(Optional, integer servings)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>ingredients</td>
                      <td style={{ padding: '0.6rem', fontStyle: 'italic' }}>1 lb ground beef; 8 taco shells; 1 cup cheese <span style={{ color: 'var(--text-muted)' }}>(Optional, semicolon separated)</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>instructions</td>
                      <td style={{ padding: '0.6rem', fontStyle: 'italic' }}>Brown the beef in a pan; Warm taco shells; Assemble tacos <span style={{ color: 'var(--text-muted)' }}>(Optional, semicolon separated)</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div 
                style={{ 
                  background: 'var(--primary-light)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.85rem', 
                  fontSize: '0.85rem', 
                  border: '1px solid rgba(211, 84, 0, 0.1)' 
                }}
              >
                <strong>Note:</strong> Optional fields can be left blank (e.g. `prep_time`, `cook_time`, `servings`). Make sure column headers are all lowercase.
              </div>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleDownloadTemplate} 
                style={{ alignSelf: 'flex-end', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Download CSV Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
