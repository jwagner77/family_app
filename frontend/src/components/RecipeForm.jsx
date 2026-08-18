import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X, Image as ImageIcon } from 'lucide-react';

export default function RecipeForm({ recipe, onSuccess, onCancel, showToast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [ingredients, setIngredients] = useState([{ amount: '', unit: '', name: '', raw_text: '' }]);
  const [instructions, setInstructions] = useState([{ step_number: 1, instruction_text: '' }]);
  const [loading, setLoading] = useState(false);

  // Tags state
  const [tags, setTags] = useState('');
  const [retainedTags, setRetainedTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const data = await res.json();
          setRetainedTags(data);
        }
      } catch (err) {
        console.error('Failed to load reusable tags in form:', err);
      }
    };
    fetchTags();
  }, []);

  const getTagSuggestions = (query) => {
    if (!query) return retainedTags.slice(0, 10);
    const parts = query.split(',');
    const lastPart = parts[parts.length - 1].trim().toLowerCase();
    if (!lastPart) return retainedTags.slice(0, 10);
    return retainedTags.filter(tag => tag.toLowerCase().includes(lastPart) && !parts.slice(0, -1).map(p => p.trim().toLowerCase()).includes(tag.toLowerCase())).slice(0, 8);
  };

  const handleSelectTagSuggestion = (suggestion) => {
    const parts = tags.split(',');
    parts[parts.length - 1] = ' ' + suggestion;
    setTags(parts.join(', ').trim() + ', ');
  };

  const renderTagSuggestions = () => {
    const suggestions = getTagSuggestions(tags);
    if (suggestions.length === 0) return null;
    return (
      <div 
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: '150px',
          overflowY: 'auto',
          marginTop: '0.25rem'
        }}
      >
        {suggestions.map((s, idx) => (
          <div
            key={idx}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectTagSuggestion(s);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'background var(--transition-fast)',
              borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
              color: 'var(--text-main)',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {s}
          </div>
        ))}
      </div>
    );
  };

  // Pre-fill fields if we are editing an existing recipe
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setPrepTime(recipe.prep_time ? String(recipe.prep_time) : '');
      setCookTime(recipe.cook_time ? String(recipe.cook_time) : '');
      setServings(recipe.servings ? String(recipe.servings) : '');
      setSourceUrl(recipe.source_url || '');
      setImagePreview(recipe.image_path || '');
      setTags(recipe.tags || '');
      
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients.map(ing => ({
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || '',
          raw_text: ing.raw_text || ''
        })));
      } else {
        setIngredients([{ amount: '', unit: '', name: '', raw_text: '' }]);
      }

      if (recipe.instructions && recipe.instructions.length > 0) {
        setInstructions(recipe.instructions.map(inst => ({
          step_number: inst.step_number,
          instruction_text: inst.instruction_text || ''
        })));
      } else {
        setInstructions([{ step_number: 1, instruction_text: '' }]);
      }
    }
  }, [recipe]);

  // Handle image select
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Ingredients handlers
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    
    // Auto-update raw_text
    if (field !== 'raw_text') {
      const amt = newIngredients[index].amount;
      const unt = newIngredients[index].unit;
      const nm = newIngredients[index].name;
      newIngredients[index].raw_text = `${amt} ${unt} ${nm}`.trim().replace(/\s+/g, ' ');
    }
    
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: '', name: '', raw_text: '' }]);
  };

  const removeIngredient = (index) => {
    if (ingredients.length === 1) {
      setIngredients([{ amount: '', unit: '', name: '', raw_text: '' }]);
    } else {
      setIngredients(ingredients.filter((_, idx) => idx !== index));
    }
  };

  // Instructions handlers
  const handleInstructionChange = (index, value) => {
    const newInstructions = [...instructions];
    newInstructions[index].instruction_text = value;
    setInstructions(newInstructions);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { step_number: instructions.length + 1, instruction_text: '' }]);
  };

  const removeInstruction = (index) => {
    const filtered = instructions.filter((_, idx) => idx !== index);
    // Re-index steps
    const reindexed = filtered.map((inst, idx) => ({
      ...inst,
      step_number: idx + 1
    }));
    setInstructions(reindexed.length === 0 ? [{ step_number: 1, instruction_text: '' }] : reindexed);
  };

  const moveInstruction = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === instructions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newInstructions = [...instructions];
    
    // Swap contents
    const tempText = newInstructions[index].instruction_text;
    newInstructions[index].instruction_text = newInstructions[targetIdx].instruction_text;
    newInstructions[targetIdx].instruction_text = tempText;

    setInstructions(newInstructions);
  };

  // Form Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please specify a recipe title.', 'error');
      return;
    }

    // Filter empty ingredients/instructions
    const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
    const validInstructions = instructions
      .filter(inst => inst.instruction_text.trim() !== '')
      .map((inst, idx) => ({
        step_number: idx + 1,
        instruction_text: inst.instruction_text
      }));

    if (validIngredients.length === 0) {
      showToast('Please add at least one ingredient.', 'error');
      return;
    }

    setLoading(true);

    const recipeData = {
      title: title.trim(),
      description: description.trim(),
      prep_time: prepTime ? parseInt(prepTime, 10) : null,
      cook_time: cookTime ? parseInt(cookTime, 10) : null,
      servings: servings ? parseInt(servings, 10) : null,
      source_url: sourceUrl.trim(),
      ingredients: validIngredients,
      instructions: validInstructions,
      image_path: imagePreview && !imagePreview.startsWith('blob:') ? imagePreview : '',
      tags: tags.trim()
    };

    // Prepare multipart form data if image is selected
    const formData = new FormData();
    formData.append('recipe', JSON.stringify(recipeData));
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const isEdit = recipe && recipe.id;
      const url = isEdit ? `/api/recipes/${recipe.id}` : '/api/recipes';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        body: formData // Body is FormData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dual-pane" style={{ gap: '2rem' }}>
        {/* Left Side Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: '1.5 1 320px' }}>
          <div className="form-group">
            <label htmlFor="title">Recipe Title *</label>
            <input 
              id="title"
              type="text" 
              className="input-control" 
              placeholder="e.g. Grandma's Famous Lasagna" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea 
              id="description"
              className="input-control" 
              placeholder="Provide a brief summary of the dish, background story, or notes..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid-3-col">
            <div className="form-group">
              <label htmlFor="prep-time">Prep Time (mins)</label>
              <input 
                id="prep-time"
                type="number" 
                className="input-control" 
                placeholder="e.g. 15"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cook-time">Cook Time (mins)</label>
              <input 
                id="cook-time"
                type="number" 
                className="input-control" 
                placeholder="e.g. 45"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="servings">Servings</label>
              <input 
                id="servings"
                type="number" 
                className="input-control" 
                placeholder="e.g. 6"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="source-url">Recipe Source Website URL</label>
            <input 
              id="source-url"
              type="url" 
              className="input-control" 
              placeholder="https://example.com/lasagna"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="tags">Tags (comma-separated, e.g. Breakfast, Dinner, Dessert)</label>
            <input 
              id="tags"
              type="text" 
              className="input-control" 
              placeholder="e.g. Breakfast, Dinner, Dessert, Keto, Spicy..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && renderTagSuggestions()}
          </div>
        </div>

        {/* Right Side Image Upload */}
        <div className="form-group" style={{ height: '100%', justifyContent: 'center', flex: '1 1 220px' }}>
          <label>Recipe Image</label>
          <div 
            style={{ 
              width: '100%', 
              height: '240px', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              overflow: 'hidden', 
              position: 'relative', 
              background: 'var(--bg-app)' 
            }}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(''); }}
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'rgba(0,0,0,0.5)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem' 
                  }}
                  title="Remove Image"
                >
                  ×
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={48} style={{ color: 'var(--border-color)', marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.85rem' }}>No image selected</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            id="file-upload-input"
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => document.getElementById('file-upload-input').click()}
            style={{ marginTop: '0.75rem', width: '100%' }}
          >
            Upload Photo
          </button>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

      {/* Lists Editor */}
      <div className="dual-pane" style={{ gap: '2.5rem' }}>
        {/* Ingredients Column */}
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Ingredients List</h3>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={addIngredient}>
              <Plus size={16} /> Add Ingredient
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="recipe-ingredient-row">
                <input 
                  type="text" 
                  className="input-control ingredient-amount" 
                  placeholder="Amt (1/2)" 
                  value={ing.amount} 
                  onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                />
                <input 
                  type="text" 
                  className="input-control ingredient-unit" 
                  placeholder="Unit (cup)" 
                  value={ing.unit} 
                  onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                />
                <input 
                  type="text" 
                  className="input-control ingredient-name" 
                  placeholder="Ingredient Name *" 
                  value={ing.name} 
                  onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.75rem', color: 'var(--danger)', flexShrink: 0 }} 
                  onClick={() => removeIngredient(idx)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions Column */}
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Instructions Steps</h3>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={addInstruction}>
              <Plus size={16} /> Add Step
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {instructions.map((inst, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                <span 
                  style={{ 
                    background: 'var(--primary-light)', 
                    color: 'var(--primary)', 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    marginTop: '6px',
                    flexShrink: 0 
                  }}
                >
                  {inst.step_number}
                </span>
                <textarea 
                  className="input-control" 
                  placeholder="Describe this step..." 
                  value={inst.instruction_text} 
                  onChange={(e) => handleInstructionChange(idx, e.target.value)}
                  style={{ flex: 1, minHeight: '60px', padding: '0.5rem 0.75rem' }}
                  required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                    onClick={() => moveInstruction(idx, 'up')}
                    disabled={idx === 0}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                    onClick={() => moveInstruction(idx, 'down')}
                    disabled={idx === instructions.length - 1}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.75rem', color: 'var(--danger)', marginTop: '4px' }} 
                  onClick={() => removeInstruction(idx)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons Actions */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem', 
          marginTop: '2rem', 
          paddingTop: '1.25rem', 
          borderTop: '1px solid var(--border-color)' 
        }}
      >
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
          <X size={18} /> Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Recipe'}
        </button>
      </div>
    </form>
  );
}
