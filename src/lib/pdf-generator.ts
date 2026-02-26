import jsPDF from 'jspdf';
import { type Student, type BadgeModel } from './types';
import { type BadgeStyleConfig, type TextStyle } from './badge-styles';

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

async function toDataURL(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Erro ao converter imagem para DataURL: ${url}`, error);
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    }
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
}

export const generatePdf = async (
  students: Student[], 
  fallbackBackground: string, 
  fallbackStyle: BadgeStyleConfig,
  models: BadgeModel[]
) => {
    const a4 = { width: 210, height: 297 };
    const badgesPerLine = 2;
    const badgesPerColumn = 3; 
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 10;
    const marginY = 15;
    const gapX = 10;
    const gapY = 10;

    const badgeWidth = (a4.width - marginX * 2 - gapX) / badgesPerLine;
    const badgeHeight = badgeWidth * (BADGE_BASE_HEIGHT / BADGE_BASE_WIDTH);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pxToMmX = badgeWidth / BADGE_BASE_WIDTH;
    const pxToMmY = badgeHeight / BADGE_BASE_HEIGHT;
    
    const renderTextOnPdf = (text: string, style: TextStyle, x: number, y: number) => {
        if (!text) return;

        const bgRgb = hexToRgb(style.backgroundColor);
        const bgOpacity = typeof style.backgroundOpacity === 'number' ? style.backgroundOpacity : 0;
        
        if (bgRgb && bgOpacity > 0) {
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            pdf.setGState(new (pdf as any).GState({ opacity: bgOpacity }));
            pdf.roundedRect(
                x + (style.x || 0) * pxToMmX, 
                y + (style.y || 0) * pxToMmY, 
                (style.width || 100) * pxToMmX, 
                (style.height || 40) * pxToMmY, 
                (style.backgroundRadius || 0) * pxToMmX, 
                (style.backgroundRadius || 0) * pxToMmY, 
                'F'
            );
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }

        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) {
          pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        }

        const fontSizeMm = (style.fontSize || 24) * pxToMmY;
        const pdfFontSizePt = fontSizeMm * 2.83465;
        
        pdf.setFontSize(pdfFontSizePt);
        pdf.setFont('helvetica', style.fontWeight === 'bold' ? 'bold' : 'normal');
        
        const textPaddingX = 2 * pxToMmX;
        const horizontalOffset = (style.paddingLeft || 0) * pxToMmX;
        const verticalOffset = (style.paddingTop || 0) * pxToMmY;
        
        const textX = x + (style.x || 0) * pxToMmX + (style.textAlign === 'center' ? (style.width || 0) * pxToMmX / 2 : style.textAlign === 'right' ? (style.width || 0) * pxToMmX - textPaddingX : textPaddingX) + horizontalOffset;
        const textY = y + ((style.y || 0) + (style.height || 0) / 2) * pxToMmY + (fontSizeMm * 0.3) + verticalOffset;

        // Garante que as coordenadas sejam números válidos
        const safeX = isNaN(textX) ? x : textX;
        const safeY = isNaN(textY) ? y : textY;

        pdf.text(
            String(text),
            safeX,
            safeY,
            { 
              maxWidth: (style.width || 100) * pxToMmX - (textPaddingX * 2), 
              align: (style.textAlign || 'left') as any,
              baseline: 'middle'
            }
        );
    };

    const backgroundCache: Record<string, string> = {};

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        if (i > 0 && i % totalPerPage === 0) {
            pdf.addPage();
        }

        const pos = i % totalPerPage;
        const col = pos % badgesPerLine;
        const row = Math.floor(pos / badgesPerLine);

        const x = marginX + col * (badgeWidth + gapX);
        const y = marginY + row * (badgeHeight + gapY);

        const studentModel = models.find(m => m.id === student.modeloId);
        const currentBackground = studentModel?.fundoCrachaUrl || fallbackBackground;
        const currentStyle = studentModel?.badgeStyle || fallbackStyle;

        try {
            if (!backgroundCache[currentBackground]) {
                backgroundCache[currentBackground] = await toDataURL(currentBackground);
            }
            pdf.addImage(backgroundCache[currentBackground], 'JPEG', x, y, badgeWidth, badgeHeight);
        } catch (e) {
            console.error("Erro ao adicionar fundo no PDF", e);
        }

        if (student.fotoUrl) {
          try {
            const studentPhotoDataUrl = await toDataURL(student.fotoUrl);
            pdf.addImage(
                studentPhotoDataUrl, 'JPEG', 
                x + (currentStyle.photo.x || 0) * pxToMmX, 
                y + (currentStyle.photo.y || 0) * pxToMmY, 
                (currentStyle.photo.width || 100) * pxToMmX, 
                (currentStyle.photo.height || 100) * pxToMmY
            );
          } catch (e) {
            console.error("Erro na foto do aluno no PDF:", student.nome, e);
          }
        }

        if (currentStyle.photo.hasBorder && (currentStyle.photo.borderWidth || 0) > 0) {
            const borderColorRgb = hexToRgb(currentStyle.photo.borderColor);
            if (borderColorRgb) {
                pdf.setDrawColor(borderColorRgb.r, borderColorRgb.g, borderColorRgb.b);
                pdf.setLineWidth((currentStyle.photo.borderWidth || 1) * pxToMmX);
                const rx = (currentStyle.photo.borderRadius || 0) * pxToMmX;
                const ry = (currentStyle.photo.borderRadius || 0) * pxToMmY;
                pdf.roundedRect(
                    x + (currentStyle.photo.x || 0) * pxToMmX, 
                    y + (currentStyle.photo.y || 0) * pxToMmY, 
                    (currentStyle.photo.width || 100) * pxToMmX, 
                    (currentStyle.photo.height || 100) * pxToMmY,
                    rx, ry, 'S'
                );
            }
        }

        renderTextOnPdf(student.nome, currentStyle.name, x, y);
        renderTextOnPdf(student.turma, currentStyle.turma, x, y);
        
        if (currentStyle.customFields) {
            currentStyle.customFields.forEach(field => {
                const value = student.customData?.[field.id];
                if (value) renderTextOnPdf(value, field, x, y);
            });
        }
    }
    
    pdf.save('crachas-gerados.pdf');
};