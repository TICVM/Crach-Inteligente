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
        // Fallback para uma imagem vazia ou placeholder se falhar
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    }
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

export const generatePdf = async (
  students: Student[], 
  fallbackBackground: string, 
  fallbackStyle: BadgeStyleConfig,
  models: BadgeModel[]
) => {
    const a4 = { width: 210, height: 297 };
    const badgesPerLine = 2;
    const badgesPerColumn = 3; // Alterado para 3 (total 6 por página)
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 10;
    const marginY = 15;
    const gapX = 10;
    const gapY = 10;

    // Calcula largura do crachá para caber 2 por linha com gap
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
        const bgRgb = hexToRgb(style.backgroundColor);
        if (bgRgb && style.backgroundOpacity > 0) {
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            pdf.setGState(new (pdf as any).GState({ opacity: style.backgroundOpacity }));
            pdf.roundedRect(
                x + style.x * pxToMmX, 
                y + style.y * pxToMmY, 
                style.width * pxToMmX, 
                style.height * pxToMmY, 
                style.backgroundRadius * pxToMmX, 
                style.backgroundRadius * pxToMmY, 
                'F'
            );
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }

        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) {
          pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        }

        const fontSizeMm = style.fontSize * pxToMmY;
        const pdfFontSizePt = fontSizeMm * 2.83465;
        
        pdf.setFontSize(pdfFontSizePt);
        pdf.setFont('helvetica', style.fontWeight === 'bold' ? 'bold' : 'normal');
        
        const textPaddingX = 2 * pxToMmX;
        
        // Deslocamento horizontal e vertical customizado
        const horizontalOffset = style.paddingLeft * pxToMmX;
        const verticalOffset = style.paddingTop * pxToMmY;
        
        const textX = x + style.x * pxToMmX + (style.textAlign === 'center' ? style.width * pxToMmX / 2 : style.textAlign === 'right' ? style.width * pxToMmX - textPaddingX : textPaddingX) + horizontalOffset;
        const textY = y + (style.y + style.height / 2) * pxToMmY + (fontSizeMm * 0.3) + verticalOffset;

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

        // 1. Adiciona o Fundo
        try {
            if (!backgroundCache[currentBackground]) {
                backgroundCache[currentBackground] = await toDataURL(currentBackground);
            }
            pdf.addImage(backgroundCache[currentBackground], 'JPEG', x, y, badgeWidth, badgeHeight);
        } catch (e) {
            console.error("Erro ao adicionar fundo no PDF", e);
        }

        // 2. Adiciona a Foto
        if (student.fotoUrl) {
          try {
            const studentPhotoDataUrl = await toDataURL(student.fotoUrl);
            pdf.addImage(
                studentPhotoDataUrl, 'JPEG', 
                x + currentStyle.photo.x * pxToMmX, 
                y + currentStyle.photo.y * pxToMmY, 
                currentStyle.photo.width * pxToMmX, 
                currentStyle.photo.height * pxToMmY
            );
          } catch (e) {
            console.error("Erro na foto do aluno no PDF:", student.nome, e);
          }
        }

        // 3. Desenha a borda da foto
        if (currentStyle.photo.hasBorder && currentStyle.photo.borderWidth > 0) {
            const borderColorRgb = hexToRgb(currentStyle.photo.borderColor);
            if (borderColorRgb) {
                pdf.setDrawColor(borderColorRgb.r, borderColorRgb.g, borderColorRgb.b);
                pdf.setLineWidth(currentStyle.photo.borderWidth * pxToMmX);
                const rx = currentStyle.photo.borderRadius * pxToMmX;
                const ry = currentStyle.photo.borderRadius * pxToMmY;
                pdf.roundedRect(
                    x + currentStyle.photo.x * pxToMmX, 
                    y + currentStyle.photo.y * pxToMmY, 
                    currentStyle.photo.width * pxToMmX, 
                    currentStyle.photo.height * pxToMmY,
                    rx, ry, 'S'
                );
            }
        }

        // 4. Adiciona os Elementos de Texto
        renderTextOnPdf(student.nome, currentStyle.name, x, y);
        renderTextOnPdf(student.turma, currentStyle.turma, x, y);
        currentStyle.customFields.forEach(field => {
            const value = student.customData?.[field.id];
            if (value) renderTextOnPdf(value, field, x, y);
        });
    }
    
    pdf.save('crachas-gerados.pdf');
};
