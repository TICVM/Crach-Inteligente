import jsPDF from 'jspdf';
import { type Student } from './types';
import { type BadgeStyleConfig } from './badge-styles';

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

async function toDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
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
    const marginX = 10;
    const marginY = 10;
    const gapX = 5;
    const gapY = 5;

    const badgeWidth = (a4.width - marginX * 2 - gapX * (badgesPerLine - 1)) / badgesPerLine;
    const badgeHeight = badgeWidth * (BADGE_BASE_HEIGHT / BADGE_BASE_WIDTH);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pxToMmX = badgeWidth / BADGE_BASE_WIDTH;
    const pxToMmY = badgeHeight / BADGE_BASE_HEIGHT;
    
    const renderTextOnPdf = (text: string, style: typeof styles.name, x: number, y: number) => {
        // Text Background
        const rgb = hexToRgb(style.backgroundColor);
        if (rgb && style.backgroundOpacity > 0) {
            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            // jsPDF does not support fillOpacity directly in rect, so we can't use it.
            // It will be a solid color.
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

        // Text
        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) {
          pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        }
        pdf.setFontSize(style.fontSize * pxToMmX * 2.5);
        pdf.setFont('helvetica', style.fontWeight);
        const textPaddingX = 15 * pxToMmX;

        pdf.text(
            text,
            x + style.x * pxToMmX + textPaddingX,
            y + (style.y + style.height / 2) * pxToMmY,
            { maxWidth: style.width * pxToMmX - (textPaddingX * 2), align: style.textAlign as any, baseline: 'middle' }
        );
    };


    const backgroundDataUrl = backgroundUrl.startsWith('data:') ? backgroundUrl : await toDataURL(backgroundUrl);

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
        const studentPhotoDataUrl = student.photo.startsWith('data:') ? student.photo : await toDataURL(student.photo);
        // jsPDF does not support clipping with rounded corners for images easily. We'll add a rectangular image.
        pdf.addImage(
            studentPhotoDataUrl, 'PNG', 
            x + styles.photo.x * pxToMmX, 
            y + styles.photo.y * pxToMmY, 
            styles.photo.width * pxToMmX, 
            styles.photo.height * pxToMmY
        );

        // 3. Add Name, Turma and Custom Fields
        renderTextOnPdf(student.name, styles.name, x, y);
        renderTextOnPdf(student.turma, styles.turma, x, y);
        styles.customFields.forEach(field => {
            renderTextOnPdf(field.text, field, x, y);
        });
    }
    
    pdf.save('crachas.pdf');
};
