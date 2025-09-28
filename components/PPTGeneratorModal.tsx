
import React, { useState, useEffect } from 'react';
import type { ReportTemplate, PptTheme, FormField } from '../types';
import { FieldType } from '../types';
import { pngPalettes } from './pptThemes';
import { GoogleGenAI, Modality } from "@google/genai";

declare const PptxGenJS: any;

interface PPTGeneratorModalProps {
  template: ReportTemplate;
  formData: any;
  onClose: () => void;
}

type PhotoOption = 'original' | 'enhanced' | 'remove_bg';
type AiVisualStyle = 'minimalist' | 'photorealistic' | 'cartoon' | '3d-render' | 'animated-vector';
type AspectRatio = '16:9' | '4:3' | '1:1';

export const PPTGeneratorModal: React.FC<PPTGeneratorModalProps> = ({ template, formData, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState<PptTheme>(pngPalettes[0]);
  const [photoOption, setPhotoOption] = useState<PhotoOption>('original');
  const [aiVisualStyle, setAiVisualStyle] = useState<AiVisualStyle>('minimalist');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [isPptxGenJsLoaded, setIsPptxGenJsLoaded] = useState(false);


  useEffect(() => {
    try {
      setAi(new GoogleGenAI({ apiKey: process.env.API_KEY }));
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI", e);
    }

    if ((window as any).PptxGenJS) {
        setIsPptxGenJsLoaded(true);
        return;
    }
    const interval = setInterval(() => {
        if ((window as any).PptxGenJS) {
            setIsPptxGenJsLoaded(true);
            clearInterval(interval);
        }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const generateAIIcon = async (prompt: string): Promise<string | null> => {
    if (!ai) {
        console.warn("GoogleGenAI not initialized. Skipping icon generation.");
        return null;
    }
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
        }
    } catch (error) {
        console.error('Error generating AI icon:', error);
    }
    return null;
  };

  const processPhoto = async (base64PhotoWithPrefix: string): Promise<string> => {
    if (photoOption === 'original' || !ai) return base64PhotoWithPrefix;

    setLoadingMessage('Enhancing user photos...');
    const prompt = photoOption === 'enhanced' 
        ? 'Subtly enhance this photo by improving lighting, sharpening details, and balancing colors to look more professional. Do not crop or drastically alter the content.'
        : 'Isolate the main subject of this image and remove the background, making it transparent. The output should be a PNG with a transparent background.';

    const mimeType = base64PhotoWithPrefix.split(';')[0].split(':')[1];
    const base64Data = base64PhotoWithPrefix.split(',')[1];
    
    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (error) {
        console.error('Error processing photo with Gemini:', error);
    }
    return base64PhotoWithPrefix; // Fallback to original
  };

  const handleExport = async () => {
    setIsLoading(true);

    try {
      const PptxGenJS = (window as any).PptxGenJS;
      if (!PptxGenJS) {
        throw new Error("PptxGenJS library not found on window object.");
      }
      let pptx = new PptxGenJS();
      
      switch (aspectRatio) {
        case '16:9': pptx.layout = 'LAYOUT_16x9'; break;
        case '4:3': pptx.layout = 'LAYOUT_4x3'; break;
        case '1:1':
            pptx.defineLayout({ name: 'SQUARE', width: 10, height: 10 });
            pptx.layout = 'SQUARE';
            break;
      }
      
      const p = selectedTheme.palette;
      
      setLoadingMessage('Generating AI title icon...');
      const iconPrompt = `A ${aiVisualStyle}, professional vector icon for a "${template.name}" report. Use a limited color palette of ${p.primary} and ${p.accent}. The icon should be on a transparent background.`;
      const titleIcon = await generateAIIcon(iconPrompt);

      setLoadingMessage('Creating title slide...');
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: p.primary };
      if(titleIcon) {
        titleSlide.addImage({ data: titleIcon, x: '5%', y: '35%', w: '10%', h: '15%' });
      }
      titleSlide.addText(template.title, {
        x: '17%', y: '30%', w: '78%', h: '25%',
        fontFace: 'Merriweather', fontSize: 36,
        color: p.text_light, bold: true, valign: 'middle'
      });

      const churchName = formData.header?.churchName || formData.generalInfo?.branchName || 'Adventist Church';
      const quarter = formData.header?.quarter || formData.generalInfo?.reportingQuarter || '';
      
      titleSlide.addText(`${churchName}\n${quarter}`, {
        x: '17%', y: '55%', w: '78%', h: '15%',
        fontFace: 'Roboto', fontSize: 20,
        color: p.text_light
      });
      
      for (const [sIndex, section] of template.sections.entries()) {
        setLoadingMessage(`Processing section ${sIndex + 1}/${template.sections.length}: ${section.title}`);
        
        const sectionIconPrompt = `A ${aiVisualStyle}, professional vector icon for a report section titled "${section.title}". Use a color palette based on ${p.primary} and ${p.accent}. Transparent background. Simple and clean.`;
        const sectionIcon = await generateAIIcon(sectionIconPrompt);

        const sectionSlide = pptx.addSlide();
        sectionSlide.background = { color: p.background };
        sectionSlide.addText(section.title, {
          x: '5%', y: '5%', w:'80%', h: '15%',
          fontFace: 'Merriweather', fontSize: 28, color: p.primary, valign: 'middle'
        });
        if (sectionIcon) {
             sectionSlide.addImage({ data: sectionIcon, x: '88%', y: '4%', w: '10%', h: '18%' });
        }
        sectionSlide.addShape(pptx.shapes.LINE, { x: '5%', y: '22%', w: '90%', h: 0, line: { color: p.accent, width: 2 } });

        for(const field of section.fields) {
            const value = formData[section.id]?.[field.id];
            if (!value || (Array.isArray(value) && value.filter(Boolean).length === 0)) continue;

            const contentSlide = pptx.addSlide();
            contentSlide.addText(`${section.title} > ${field.label}`, { x: '5%', y: '3%', w: '90%', h: '7%', fontFace: 'Merriweather', fontSize: 16, color: p.secondary, bold: true });
             
            switch(field.type) {
                case FieldType.TEXT:
                case FieldType.TEXTAREA:
                case FieldType.NUMBER:
                case FieldType.DATE:
                     contentSlide.addText(field.label, { x: '5%', y: '15%', w:'90%', h: '10%', fontFace: 'Roboto', fontSize: 20, color: p.text, bold: true });
                     contentSlide.addText(String(value), { x: '5%', y: '25%', w:'90%', h: '65%', fontFace: 'Roboto', fontSize: 18, color: p.text, valign: 'top' });
                     break;
                
                case FieldType.BULLET:
                     const bullets = (value as string[]).filter(b => b && b.trim() !== '');
                     if (bullets.length > 0) {
                        contentSlide.addText(field.label, { x: '5%', y: '15%', w:'90%', h: '10%', fontFace: 'Roboto', fontSize: 20, color: p.text, bold: true });
                        contentSlide.addText(bullets.map(b => ({ text: b, options: { fontSize: 18 } })), { x: '5%', y: '25%', w:'90%', h: '65%', fontFace: 'Roboto', color: p.text, bullet: true });
                     }
                     break;

                case FieldType.TABLE:
                    const tableData = value as any[];
                    if (tableData.length === 0) break;
                    
                    const columns = field.columns || [];
                    const keys = Object.keys(tableData[0]).filter(k => k !== 'photos' && k !== 'tooltips');
                    
                    const isPotentiallyNumeric = columns.length === 2 && tableData.every(row => {
                        const val = row[keys[1]];
                        return val !== null && val !== undefined && !isNaN(parseFloat(String(val).replace(/[^0-9.-]+/g, "")));
                    });

                    if (isPotentiallyNumeric) {
                        contentSlide.addText(field.label, { x: '5%', y: '15%', w:'90%', h: '10%', fontFace: 'Roboto', fontSize: 20, color: p.text, bold: true });
                        const chartLabels = tableData.map(row => String(row[keys[0]] || ''));
                        const chartValues = tableData.map(row => parseFloat(String(row[keys[1]] || '0').replace(/[^0-9.-]+/g, "")));
                        
                        const chartData = [{ name: field.label, labels: chartLabels, values: chartValues }];
                        contentSlide.addChart(pptx.charts.BAR, chartData, { x: '5%', y: '25%', w: '90%', h: '70%', barDir: 'bar', valueBarColors: [p.primary, p.secondary, p.accent], showValue: true });
                    } else {
                        contentSlide.addText(field.label, { x: '5%', y: '15%', w:'90%', h: '10%', fontFace: 'Roboto', fontSize: 20, color: p.text, bold: true });
                        let tableRows: any[][] = [columns.map(c => ({ text: c, options: { bold: true, fill: p.secondary, color: p.text_light } }))];
                        tableData.forEach(row => {
                            let rowData = keys.map(key => String(row[key] || ''));
                            tableRows.push(rowData);
                        });
                        contentSlide.addTable(tableRows, { x: '5%', y: '25%', w: '90%', autoPage: true, border: { type: 'solid', pt: 1, color: p.accent } });
                    }

                    if (field.hasPhotoUploads) {
                        for (const row of tableData) {
                            if (row.photos && row.photos.length > 0) {
                                const photoSlide = pptx.addSlide();
                                const firstColKey = keys[0];
                                photoSlide.addText(`Photos for: ${row[firstColKey] || field.label}`, { x: '5%', y: '3%', w: '90%', h: '10%', fontFace: 'Merriweather', fontSize: 18, color: p.secondary });
                                for (const [pIndex, photo] of (row.photos as string[]).slice(0, 4).entries()) {
                                    const processedPhoto = await processPhoto(photo);
                                    const x = pIndex % 2 === 0 ? '5%' : '52.5%';
                                    const y = Math.floor(pIndex / 2) === 0 ? '15%' : '55%';
                                    photoSlide.addImage({ data: processedPhoto, x, y, w: '42.5%', h: '38%' });
                                }
                            }
                        }
                    }
                    break;
                case FieldType.PHOTOS:
                     const photos = (value as string[]).filter(p => p);
                     if (photos.length > 0) {
                         contentSlide.addText(field.label, { x: '5%', y: '15%', w:'90%', h: '10%', fontFace: 'Roboto', fontSize: 20, color: p.text, bold: true });
                         for (const [index, photo] of photos.slice(0, 4).entries()) {
                             const processedPhoto = await processPhoto(photo);
                             const x = index % 2 === 0 ? '5%' : '52.5%';
                             const y = Math.floor(index / 2) === 0 ? '25%' : '60%';
                             contentSlide.addImage({ data: processedPhoto, x, y, w: '42.5%', h: '35%', sizing: { type: 'contain', w: '42.5%', h: '35%' } });
                         }
                     }
                     break;
            }
        }
      }

      setLoadingMessage('Finalizing presentation...');
      const thankYouSlide = pptx.addSlide();
      thankYouSlide.background = { color: p.primary };
      thankYouSlide.addText('Thank You', { x: '0%', y: '0%', w:'100%', h:'100%', align: 'center', valign: 'middle', fontFace: 'Merriweather', fontSize: 48, color: p.text_light });

      await pptx.writeFile({ fileName: `${template.key}-presentation.pptx` });

    } catch (error) {
      console.error('Error generating presentation:', error);
      alert('An error occurred while generating the presentation. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const ratioClasses = {
      '16:9': 'aspect-video',
      '4:3': 'aspect-[4/3]',
      '1:1': 'aspect-square'
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-[var(--brand-teal)]">Generate PowerPoint Presentation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <svg className="animate-spin h-12 w-12 text-[var(--brand-teal)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-lg font-semibold mt-4 text-gray-700">Generating your presentation...</p>
                <p className="text-sm text-gray-500">{loadingMessage}</p>
            </div>
        ) : (
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Customization Options</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color Palette</label>
                    <select
                      value={selectedTheme.key}
                      onChange={(e) => setSelectedTheme(pngPalettes.find(p => p.key === e.target.value) || pngPalettes[0])}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-[var(--brand-gold)]"
                    >
                      {pngPalettes.map(theme => (
                        <option key={theme.key} value={theme.key}>{theme.name}</option>
                      ))}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI Visual Style</label>
                    <select
                      value={aiVisualStyle}
                      onChange={(e) => setAiVisualStyle(e.target.value as AiVisualStyle)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-[var(--brand-gold)]"
                    >
                      <option value="minimalist">Minimalist</option>
                      <option value="photorealistic">Photorealistic</option>
                      <option value="cartoon">Cartoon / Comic</option>
                      <option value="animated-vector">Animated / Vector</option>
                      <option value="3d-render">3D Render</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photo Options</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="radio" name="photoOption" value="original" checked={photoOption === 'original'} onChange={() => setPhotoOption('original')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">Original Photos</span>
                      </label>
                       <label className="flex items-center">
                        <input type="radio" name="photoOption" value="enhanced" checked={photoOption === 'enhanced'} onChange={() => setPhotoOption('enhanced')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">Auto-Enhance (Gemini)</span>
                      </label>
                       <label className="flex items-center">
                        <input type="radio" name="photoOption" value="remove_bg" checked={photoOption === 'remove_bg'} onChange={() => setPhotoOption('remove_bg')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">Remove Background (Gemini)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slide Aspect Ratio</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">16:9 (Widescreen)</span>
                      </label>
                       <label className="flex items-center">
                        <input type="radio" name="aspectRatio" value="4:3" checked={aspectRatio === '4:3'} onChange={() => setAspectRatio('4:3')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">4:3 (Standard)</span>
                      </label>
                       <label className="flex items-center">
                        <input type="radio" name="aspectRatio" value="1:1" checked={aspectRatio === '1:1'} onChange={() => setAspectRatio('1:1')} className="form-radio text-[var(--brand-teal)]" />
                        <span className="ml-2 text-gray-700">1:1 (Square)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/3 p-6 flex flex-col items-center justify-center bg-gray-200">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Theme Preview</h3>
                <div className={`w-full max-w-md ${ratioClasses[aspectRatio]} bg-white rounded-md shadow-lg p-4 flex flex-col justify-between transition-all`} style={{ backgroundColor: selectedTheme.palette.primary }}>
                    <div className="w-3/4">
                        <h4 className="text-xl md:text-2xl font-bold" style={{ color: selectedTheme.palette.text_light }}>{template.title}</h4>
                        <p className="text-xs md:text-sm" style={{ color: selectedTheme.palette.text_light }}>Theme: {selectedTheme.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: selectedTheme.palette.secondary }}></div>
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: selectedTheme.palette.accent }}></div>
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: selectedTheme.palette.background }}></div>
                    </div>
                </div>
                 <p className="text-xs text-gray-500 mt-4 text-center">This is a simplified preview of your selected color theme. <br/> The final presentation will include all your data and content.</p>
              </div>
            </div>
        )}

        <div className="p-4 border-t flex justify-end bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 transition">Cancel</button>
            <button
                onClick={handleExport}
                disabled={isLoading || !ai || !isPptxGenJsLoaded}
                className="px-6 py-2 bg-orange-500 text-white font-bold rounded-md hover:bg-orange-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed relative group"
                
            >
              {isLoading ? 'Generating...' : 'Export .pptx'}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded-md opacity-0 group-disabled:group-hover:opacity-100 transition-opacity" role="tooltip">
                {
                    !ai ? "API Key not configured. Export disabled." 
                    : !isPptxGenJsLoaded ? "Presentation library is still loading..." 
                    : "Generate your presentation"
                }
              </span>

            </button>
        </div>
      </div>
    </div>
  );
};
