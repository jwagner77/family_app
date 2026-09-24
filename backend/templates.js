import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { addTemplate, getDefaultTemplate } from './db.js';

/**
 * Generates a bare-minimum valid .docx file containing the required template tags.
 */
export function createDefaultTemplateFile(filePath) {
  const zip = new PizZip();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // A basic Word Document layout with styling (large title, italics description, bold labels)
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Recipe Title -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="56"/>
          <w:szCs w:val="56"/>
          <w:b/>
          <w:color w:val="D35400"/>
        </w:rPr>
        <w:t>{title}</w:t>
      </w:r>
    </w:p>
    
    <!-- Description -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="22"/>
          <w:color w:val="7F8C8D"/>
        </w:rPr>
        <w:t>{description}</w:t>
      </w:r>
    </w:p>
    
    <w:p/>

    <!-- Recipe Metadata -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="2C3E50"/></w:rPr><w:t>Prep Time: </w:t></w:r>
      <w:r><w:t>{prep_time}  |  </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="2C3E50"/></w:rPr><w:t>Cook Time: </w:t></w:r>
      <w:r><w:t>{cook_time}  |  </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="2C3E50"/></w:rPr><w:t>Servings: </w:t></w:r>
      <w:r><w:t>{servings}</w:t></w:r>
    </w:p>
    
    <w:p/>
    <w:p/>

    <!-- Ingredients Section -->
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:b/>
          <w:color w:val="D35400"/>
        </w:rPr>
        <w:t>Ingredients</w:t>
      </w:r>
    </w:p>
    
    <!-- Loop through ingredients -->
    <w:p>
      <w:r><w:t>{#ingredients}•  {formatted}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{/ingredients}</w:t></w:r>
    </w:p>
    
    <w:p/>
    <w:p/>

    <!-- Instructions Section -->
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:b/>
          <w:color w:val="D35400"/>
        </w:rPr>
        <w:t>Instructions</w:t>
      </w:r>
    </w:p>
    
    <!-- Loop through instructions -->
    <w:p>
      <w:r><w:t>{#instructions}{step}.  {text}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{/instructions}</w:t></w:r>
    </w:p>
    
  </w:body>
</w:document>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);

  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filePath, buffer);
}

export async function initDefaultTemplate() {
  try {
    const defaultTpl = await getDefaultTemplate();
    const dataDir = process.env.DATA_DIR || './data';
    const filePath = path.join(dataDir, 'templates', 'default_template.docx');

    if (defaultTpl && fs.existsSync(filePath)) {
      return;
    }

    const tplDir = path.dirname(filePath);
    if (!fs.existsSync(tplDir)) {
      fs.mkdirSync(tplDir, { recursive: true });
    }

    createDefaultTemplateFile(filePath);
    
    // Register in database if not already there
    if (!defaultTpl) {
      await addTemplate('Default Classic Template', '/templates/default_template.docx', 1);
      console.log('Created and registered default DOCX template.');
    }
  } catch (error) {
    console.error('Failed to initialize default template:', error);
  }
}

/**
 * Merges recipe data with a Word Document (.docx) template file.
 */
export function renderRecipeDocx(templatePath, recipeData) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Prepare template data
  const data = {
    title: recipeData.title,
    description: recipeData.description || '',
    prep_time: recipeData.prep_time ? `${recipeData.prep_time} mins` : 'N/A',
    cook_time: recipeData.cook_time ? `${recipeData.cook_time} mins` : 'N/A',
    servings: recipeData.servings ? String(recipeData.servings) : 'N/A',
    tags: recipeData.tags || '',
    category: recipeData.tags ? recipeData.tags.split(',')[0].trim() : (recipeData.category || 'Recipe'),
    ingredients: (recipeData.ingredients || []).map(ing => {
      const amount = ing.amount || '';
      const unit = ing.unit || '';
      const name = ing.name || '';
      
      let formatted = '';
      if (ing.formatted) {
        formatted = ing.formatted;
      } else if (ing.raw_text) {
        formatted = ing.raw_text;
      } else {
        formatted = `${amount} ${unit} ${name}`.trim().replace(/\s+/g, ' ');
        if (!formatted && name) formatted = name;
      }

      return {
        amount,
        unit,
        name,
        formatted
      };
    }),
    instructions: (recipeData.instructions || []).map(inst => ({
      step: inst.step_number || '',
      text: inst.instruction_text || inst.text || ''
    })),
    notes: (recipeData.notes || []).map(n => ({
      bullet: '•',
      text: typeof n === 'string' ? n : (n.note_text || '')
    }))
  };

  doc.render(data);

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}
