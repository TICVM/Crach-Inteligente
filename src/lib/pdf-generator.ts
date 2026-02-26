import jsPDF from 'jspdf';
import { type Student } from './types';
import { type BadgeStyleConfig, type TextStyle } from './badge-styles';

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

async function toDataURL(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = () => reject(new Error(`Erro ao carregar imagem: ${url}`));
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
}

export const generatePdf = async (students: Student[], backgroundUrl: string, styles: BadgeStyleConfig) => {
    const a4 = { width: 210, height: 297 };
    const badgesPerLine = 2;
    const badgesPerColumn = 4;
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 8;
    const marginY = 8;
    const gapX = 4;
    const gapY = 4;

    const badgeWidth = (a4.width - marginX * 2 - gapX * (badgesPerLine - 1)) / badgesPerLine;
    const badgeHeight = badgeWidth * (BADGE_BASE_HEIGHT / BADGE_BASE_WIDTH);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pxToMmX = badgeWidth / BADGE_BASE_WIDTH;
    const pxToMmY = badgeHeight / BADGE_BASE_HEIGHT;
    
    const renderTextOnPdf = (text: string, style: TextStyle, x: number, y: number) => {
        const bgRgb = hexToRgb(style.backgroundColor);
        if (bgRgb && style.backgroundOpacity > 0) {
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            // Simulating opacity with lighter fill is hard in jsPDF standard, but we'll use solid for print clarity
            pdf.roundedRect(
                x + style.x * pxToMmX, 
                y + style.y * pxToMmY, 
                style.width * pxToMmX, 
                style.height * pxToMmY, 
                style.backgroundRadius * pxToMmX, 
                style.backgroundRadius * pxToMmX, 
                'F'
            );
        }

        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) {
          pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        }

        // Adjust font size for PDF
        const pdfFontSize = style.fontSize * 0.264583; // Conversion factor approx
        pdf.setFontSize(pdfFontSize * 3.5); // Adjusting scaling for jspdf units
        pdf.setFont('helvetica', style.fontWeight);
        
        const textPaddingX = 10 * pxToMmX;
        const textX = x + style.x * pxToMmX + (style.textAlign === 'center' ? style.width * pxToMmX / 2 : style.textAlign === 'right' ? style.width * pxToMmX - textPaddingX : textPaddingX);
        const textY = y + (style.y + style.height / 2) * pxToMmY;

        pdf.text(
            text,
            textX,
            textY,
            { 
              maxWidth: style.width * pxToMmX - (textPaddingX * 2), 
              align: style.textAlign as any, 
              baseline: 'middle' 
            }
        );
    };

    let backgroundDataUrl = backgroundUrl;
    try {
        backgroundDataUrl = await toDataURL(backgroundUrl);
    } catch (e) {
        console.error("Erro ao processar fundo:", e);
    }

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

        // 1. Add Background
        pdf.addImage(backgroundDataUrl, 'PNG', x, y, badgeWidth, badgeHeight);

        // 2. Add Photo
        if (student.fotoUrl) {
          try {
            const studentPhotoDataUrl = await toDataURL(student.fotoUrl);
            pdf.addImage(
                studentPhotoDataUrl, 'PNG', 
                x + styles.photo.x * pxToMmX, 
                y + styles.photo.y * pxToMmY, 
                styles.photo.width * pxToMmX, 
                styles.photo.height * pxToMmY
            );
          } catch (e) {
            console.error("Erro na foto do aluno:", student.nome, e);
          }
        }

        // 3. Draw Photo Border
        if (styles.photo.hasBorder && styles.photo.borderWidth > 0) {
            const borderColorRgb = hexToRgb(styles.photo.borderColor);
            if (borderColorRgb) {
                pdf.setDrawColor(borderColorRgb.r, borderColorRgb.g, borderColorRgb.b);
                pdf.setLineWidth(styles.photo.borderWidth * pxToMmX);
                const radius = styles.photo.borderRadius * pxToMmX;
                pdf.roundedRect(
                    x + styles.photo.x * pxToMmX, 
                    y + styles.photo.y * pxToMmY, 
                    styles.photo.width * pxToMmX, 
                    styles.photo.height * pxToMmY,
                    radius, radius, 'S'
                );
            }
        }

        // 4. Add Text Elements
        renderTextOnPdf(student.nome, styles.name, x, y);
        renderTextOnPdf(student.turma, styles.turma, x, y);
        styles.customFields.forEach(field => {
            const value = student.customData?.[field.id];
            if (value) renderTextOnPdf(value, field, x, y);
        });
    }
    
    pdf.save('crachas-escolares.pdf');
};