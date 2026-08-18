import { createWorker } from 'tesseract.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Normalizes unicode fractions into readable text (e.g., ½ -> 1/2)
 */
function normalizeFractions(text) {
  const fractions = {
    '¼': '1/4',
    '½': '1/2',
    '¾': '3/4',
    '⅐': '1/7',
    '⅑': '1/9',
    '⅒': '1/10',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
  };
  
  let result = text;
  for (const [unicode, ascii] of Object.entries(fractions)) {
    result = result.replaceAll(unicode, ascii);
  }
  return result;
}

/**
 * Parses an ingredient line into amount, unit, and name
 */
export function parseIngredientLine(line) {
  const normalized = normalizeFractions(line.trim());
  
  // Regex to match quantity (integers, decimals, fractions like 1/2, ranges like 1-2, spaces like 1 1/2)
  // e.g., "1 1/2", "0.5", "1/4", "2-3"
  const qtyRegex = /^([\d\/\s\.\-\u00bc-\u00be\u2150-\u215e]+)?\s*(.*)$/;
  const qtyMatch = normalized.match(qtyRegex);
  
  let amount = '';
  let remaining = normalized;
  
  if (qtyMatch && qtyMatch[1]) {
    amount = qtyMatch[1].trim();
    remaining = qtyMatch[2].trim();
  }
  
  // List of common cooking units
  const units = [
    'cups?', 'cup', 'tsps?', 'tsp', 'teaspoons?', 'teaspoon', 
    'tbsps?', 'tbsp', 'tablespoons?', 'tablespoon', 'g', 'grams?', 'gram', 
    'kg', 'kilograms?', 'ml', 'milliliters?', 'l', 'liters?', 'oz', 'ounces?', 'ounce', 
    'lbs?', 'pounds?', 'pound', 'pinches?', 'pinch', 'cloves?', 'clove', 
    'slices?', 'slice', 'cans?', 'can', 'packs?', 'pack', 'packages?', 'package', 
    'bags?', 'bag', 'pieces?', 'piece', 'bunches?', 'bunch', 'tins?', 'tin', 'jars?', 'jar'
  ];
  
  // Sort units by length descending to match longer words first (e.g. "tablespoons" before "tablespoon" or "tbsp")
  units.sort((a, b) => b.length - a.length);
  
  // Create unit regex
  const unitRegex = new RegExp(`^(${units.join('|')})\\b\\s*(.*)$`, 'i');
  const unitMatch = remaining.match(unitRegex);
  
  let unit = '';
  let name = remaining;
  
  if (unitMatch) {
    unit = unitMatch[1].trim().toLowerCase();
    name = unitMatch[2].trim();
  }
  
  // Clean up name (remove prep notes like ", chopped" or " - melted")
  return {
    amount: amount,
    unit: unit,
    name: name,
    raw_text: line
  };
}

/**
 * Runs OCR on the image at imagePath and parses the text into recipe fields.
 */
export async function parseRecipeImage(imagePath) {
  let text = '';
  let usedNative = false;
  
  // Try native Tesseract CLI first
  try {
    const { stdout } = await execAsync(`tesseract "${imagePath}" stdout -l eng`);
    text = stdout;
    usedNative = true;
    console.log('Successfully completed OCR using native Tesseract engine.');
  } catch (err) {
    console.warn('Native Tesseract execution failed, falling back to tesseract.js. Error:', err.message);
  }

  // Fallback to tesseract.js if native failed or is not installed
  if (!usedNative) {
    let worker;
    try {
      worker = await createWorker('eng');
      const ret = await worker.recognize(imagePath);
      text = ret.data.text;
    } catch (err) {
      console.error('Error running OCR with tesseract.js fallback:', err);
      throw new Error('OCR recognition failed: ' + err.message);
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }

  // Raw split
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return {
      title: 'Scanned Recipe',
      description: '',
      prep_time: null,
      cook_time: null,
      servings: null,
      ingredients: [],
      instructions: [],
      raw_text: text
    };
  }

  let title = '';
  let description = '';
  let prep_time = null;
  let cook_time = null;
  let servings = null;
  let ingredients = [];
  let instructions = [];

  // Title is generally the first clean line of text
  // Let's find the first line that is not a heading or too short
  for (const line of lines) {
    const cleanLine = line.toLowerCase();
    if (
      cleanLine.includes('ingredient') || 
      cleanLine.includes('direction') || 
      cleanLine.includes('instruction') || 
      cleanLine.includes('method') || 
      cleanLine.includes('step') ||
      cleanLine.length < 3
    ) {
      continue;
    }
    title = line;
    break;
  }
  
  if (!title) title = 'Scanned Recipe';

  // Heuristic Search for Times and Servings in the entire text
  const textLower = text.toLowerCase();
  
  // Prep time
  const prepMatch = textLower.match(/(?:prep|preparation)\s*(?:time)?[:\-]?\s*(\d+)\s*(?:min|minute|hr|hour)/);
  if (prepMatch) {
    prep_time = parseInt(prepMatch[1], 10);
  }
  
  // Cook time
  const cookMatch = textLower.match(/(?:cook|cooking|bake|baking)\s*(?:time)?[:\-]?\s*(\d+)\s*(?:min|minute|hr|hour)/);
  if (cookMatch) {
    cook_time = parseInt(cookMatch[1], 10);
  }
  
  // Servings
  const servingsMatch = textLower.match(/(?:servings|yield|serves|makes)\s*[:\-]?\s*(\d+)/);
  if (servingsMatch) {
    servings = parseInt(servingsMatch[1], 10);
  }

  // Parse lines into ingredients and instructions sections
  let currentSection = 'general'; // general, ingredients, instructions
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Check for section markers
    if (
      lineLower.startsWith('ingredients') || 
      lineLower.endsWith('ingredients:') ||
      lineLower === 'what you need' ||
      lineLower === 'shopping list'
    ) {
      currentSection = 'ingredients';
      continue;
    }
    
    if (
      lineLower.startsWith('instructions') || 
      lineLower.startsWith('directions') || 
      lineLower.startsWith('method') || 
      lineLower.startsWith('preparation') || 
      lineLower.startsWith('steps') ||
      lineLower.endsWith('instructions:') ||
      lineLower.endsWith('directions:')
    ) {
      currentSection = 'instructions';
      continue;
    }

    if (currentSection === 'ingredients') {
      // Clean up lines that look like advertisements, page numbers or section titles
      if (lineLower.includes('http') || lineLower.includes('www.') || lineLower.length < 3) {
        continue;
      }
      
      const parsedIng = parseIngredientLine(line);
      if (parsedIng.name) {
        ingredients.push(parsedIng);
      }
    } 
    else if (currentSection === 'instructions') {
      if (lineLower.includes('http') || lineLower.includes('www.') || lineLower.length < 5) {
        continue;
      }
      
      // Clean number prefixes like "1. ", "Step 1: ", etc.
      let cleanText = line.replace(/^\d+[\.\s\-:]+/, '').trim();
      cleanText = cleanText.replace(/^step\s*\d+[\.\s\-:]+/i, '').trim();
      
      if (cleanText) {
        instructions.push({
          step_number: instructions.length + 1,
          instruction_text: cleanText
        });
      }
    }
    else {
      // General section: if we find something starting with a number and unit, we might classify it as ingredients if we haven't found any yet
      // This is a safety fall-back.
      const isIngCandidate = /^[\d\/\s\.\u00bc-\u00be]+/.test(lineLower) && 
        (lineLower.includes('cup') || lineLower.includes('tsp') || lineLower.includes('tbsp') || lineLower.includes('spoon') || lineLower.includes('clove') || lineLower.includes('oz') || lineLower.includes('gram') || lineLower.includes('can'));
      
      if (isIngCandidate && ingredients.length < 15 && instructions.length === 0) {
        const parsedIng = parseIngredientLine(line);
        if (parsedIng.name) {
          ingredients.push(parsedIng);
        }
      }
    }
  }

  // Fallback: If ingredients list is empty, try to parse lines starting with numbers as ingredients
  if (ingredients.length === 0) {
    for (const line of lines) {
      // lines starting with digits or unicode fractions
      if (/^[\d\/\u00bc-\u00be\u2150-\u215e]/.test(line)) {
        const parsed = parseIngredientLine(line);
        if (parsed.name && parsed.name.length > 2 && parsed.name.length < 60) {
          ingredients.push(parsed);
        }
      }
    }
  }

  // Fallback: If instructions list is empty, look for longer lines that don't start with ingredient units
  if (instructions.length === 0) {
    for (const line of lines) {
      if (line.length > 30 && !/^[\d\/\u00bc-\u00be]/.test(line) && !line.toLowerCase().includes('ingredients')) {
        instructions.push({
          step_number: instructions.length + 1,
          instruction_text: line
        });
      }
    }
  }

  return {
    title,
    description,
    prep_time,
    cook_time,
    servings,
    ingredients,
    instructions,
    raw_text: text
  };
}
