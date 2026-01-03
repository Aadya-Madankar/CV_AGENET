/**
 * PDF Generator Service
 * Handles resume PDF synthesis using html2canvas and jsPDF
 */

import { PDFGeneratorResult, LogType } from '../models/types';

/**
 * Resume PDF styling template
 */
const PDF_STYLES = `
  .resume-container { 
    padding: 50px; 
    font-family: 'Helvetica', 'Arial', sans-serif; 
    line-height: 1.6; 
    color: #333; 
  }
  .resume-header { 
    text-align: center; 
    border-bottom: 2px solid #10b981; 
    padding-bottom: 20px; 
    margin-bottom: 20px; 
  }
  .resume-name { 
    font-size: 32px; 
    font-weight: bold; 
    margin: 0; 
    color: #1e293b; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
  }
  .resume-contact { 
    font-size: 14px; 
    color: #64748b; 
    margin-top: 5px; 
  }
  .resume-section-title { 
    font-size: 18px; 
    font-weight: bold; 
    color: #10b981; 
    border-bottom: 1px solid #e2e8f0; 
    margin-top: 30px; 
    margin-bottom: 15px; 
    padding-bottom: 5px; 
    text-transform: uppercase; 
  }
  .resume-item { 
    margin-bottom: 20px; 
  }
  .resume-item-title { 
    font-weight: bold; 
    font-size: 16px; 
    color: #1e293b; 
  }
  .resume-item-subtitle { 
    font-style: italic; 
    color: #475569; 
  }
  .resume-item-date { 
    float: right; 
    color: #94a3b8; 
    font-size: 14px; 
  }
  .resume-content { 
    margin-top: 8px; 
    font-size: 14px; 
  }
  ul { 
    margin: 8px 0; 
    padding-left: 20px; 
  }
  li { 
    margin-bottom: 5px; 
    list-style-type: disc; 
  }
  .skills-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 10px; 
  }
`;

/**
 * Create a hidden container for PDF rendering
 */
function createRenderContainer(html: string): HTMLDivElement {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = '-10000px';
    div.style.width = '800px';
    div.style.backgroundColor = 'white';
    div.innerHTML = `
    <style>${PDF_STYLES}</style>
    <div class="resume-container">${html}</div>
  `;
    return div;
}

/**
 * Render HTML content to PDF
 */
export async function generatePDF(
    html: string,
    filename: string,
    onLog?: (type: LogType, message: string) => void
): Promise<PDFGeneratorResult> {
    onLog?.('INFO', `Synthesis Engine: Designing high-fidelity document...`);

    const jsPDFLib = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    if (!jsPDFLib || !html2canvas) {
        const error = 'PDF libraries not loaded. Ensure jsPDF and html2canvas are available.';
        onLog?.('ERROR', error);
        return { url: '', success: false, error };
    }

    const div = createRenderContainer(html);
    document.body.appendChild(div);

    try {
        const canvas = await html2canvas(div, {
            scale: 2,
            useCORS: true
        });

        const doc = new jsPDFLib.jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        doc.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            0,
            0,
            canvas.width,
            canvas.height
        );

        const url = URL.createObjectURL(doc.output('blob'));

        onLog?.('SUCCESS', `PDF generated: ${filename}`);
        div.remove();

        return { url, success: true };
    } catch (e: any) {
        const error = `PDF Synthesis error: ${e?.message || e}`;
        onLog?.('ERROR', error);
        div.remove();
        return { url: '', success: false, error };
    }
}

/**
 * Clean up PDF blob URL when no longer needed
 */
export function revokePDFUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
