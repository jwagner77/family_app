import React, { useState } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import RecipeForm from './RecipeForm';

export default function OCRUpload({ showToast, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  // The state that holds the OCR parsed output
  const [parsedData, setParsedData] = useState(null);
  const [showRawOcr, setShowRawOcr] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processSelectedFile(selectedFile);
  };

  const processSelectedFile = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setParsedData(null);
    } else {
      showToast('Please select a valid image file (PNG/JPG).', 'error');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    processSelectedFile(droppedFile);
  };

  const runOCR = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('screenshot', file);

    try {
      const res = await fetch('/api/recipes/ocr', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to scan screenshot');
      }

      const data = await res.json();
      setParsedData(data);
      showToast('OCR scanning completed successfully! Verify details below.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl('');
    setParsedData(null);
    setShowRawOcr(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <h2>OCR Screenshot Scanner</h2>
      </div>

      {!parsedData ? (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2.5rem' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Upload Recipe Screenshot</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
              Drag and drop an image of a recipe (from a website, book, or Instagram), or upload one directly. Our system will extract the title, ingredients, and instructions steps using OCR!
            </p>

            {/* Drop Zone */}
            {!previewUrl ? (
              <div 
                className="upload-zone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('screenshot-input').click()}
              >
                <Camera />
                <div>
                  <strong>Click to select photo</strong> or drag & drop here
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PNG, JPG, JPEG</span>
                <input 
                  type="file" 
                  id="screenshot-input" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                <img 
                  src={previewUrl} 
                  alt="Screenshot Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '350px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-color)', 
                    boxShadow: 'var(--shadow-sm)' 
                  }} 
                />
                
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <button className="btn btn-outline" onClick={handleReset} style={{ flex: 1 }} disabled={loading}>
                    <ArrowLeft size={18} /> Reset
                  </button>
                  <button className="btn btn-primary" onClick={runOCR} style={{ flex: 1.5 }} disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw size={18} className="spinner" style={{ animation: 'rotate 1s infinite linear' }} /> Scanning...
                      </>
                    ) : (
                      <>
                        Scan Screenshot <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Side by Side Verification Layout */
        <div className="dual-pane animate-fade-in">
          {/* Left Pane - Screenshot Display & Raw text */}
          <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Original Screenshot</h3>
              <img 
                src={previewUrl} 
                alt="Source OCR" 
                style={{ 
                  width: '100%', 
                  maxHeight: '400px', 
                  objectFit: 'contain', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-app)' 
                }} 
              />
              <button 
                className="btn btn-secondary" 
                onClick={handleReset} 
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Scan Another Screenshot
              </button>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Raw OCR Text</h3>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} 
                  onClick={() => setShowRawOcr(!showRawOcr)}
                >
                  {showRawOcr ? 'Hide Text' : 'Show Text'}
                </button>
              </div>
              
              {showRawOcr ? (
                <textarea 
                  className="input-control animate-fade-in" 
                  value={parsedData.raw_text} 
                  readOnly 
                  style={{ 
                    width: '100%', 
                    height: '180px', 
                    fontSize: '0.85rem', 
                    fontFamily: 'monospace', 
                    background: 'var(--bg-app)', 
                    color: 'var(--text-muted)' 
                  }}
                />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  If fields were parsed incorrectly, toggle this textarea to view the raw extracted text from the screenshot for manual copying.
                </p>
              )}
            </div>
          </div>

          {/* Right Pane - Form Pre-populated with OCR Data */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Verify & Edit Parsed Details
            </h3>
            
            <RecipeForm 
              recipe={parsedData} 
              onSuccess={onImportSuccess} 
              onCancel={handleReset} 
              showToast={showToast} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
