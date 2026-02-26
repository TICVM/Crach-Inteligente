import jsPDF from 'jspdf';
import { type Student, type BadgeModel } from './types';
import { type BadgeStyleConfig, type TextStyle } from './badge-styles';

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

async function toDataURL(url: string): Promise<string> {
    if (!url) return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
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
    const badgesPerColumn = 4; // Total 8 crachás por folha
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 10;
    const marginY = 10;
    const gapX = 10;
    const gapY = 5;

    const badgeWidth = (a4.width - marginX * 2 - gapX) / badgesPerLine;
    const badgeHeight = badgeWidth * (BADGE_BASE_HEIGHT / BADGE_BASE_WIDTH);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pxToMm = badgeWidth / BADGE_BASE_WIDTH;
    
    const renderTextOnPdf = (text: string, style: TextStyle, badgeX: number, badgeY: number, manualOffsetPx: number = 0) => {
        if (!text || !style) return;

        const boxX = badgeX + (style.x || 0) * pxToMm;
        const boxY = badgeY + (style.y || 0) * pxToMm;
        const boxW = (style.width || 100) * pxToMm;
        const boxH = (style.height || 40) * pxToMm;

        // 1. Renderizar Fundo do Texto
        const bgRgb = hexToRgb(style.backgroundColor);
        const bgOpacity = typeof style.backgroundOpacity === 'number' ? style.backgroundOpacity : 0;
        
        if (bgRgb && bgOpacity > 0) {
            pdf.setGState(new (pdf as any).GState({ opacity: bgOpacity }));
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            pdf.roundedRect(
                boxX, 
                boxY, 
                boxW, 
                boxH, 
                (style.backgroundRadius || 0) * pxToMm, 
                (style.backgroundRadius || 0) * pxToMm, 
                'F'
            );
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }

        // 2. Configurar Fonte e Tamanho
        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        pdf.setFont('helvetica', style.fontWeight === 'bold' ? 'bold' : 'normal');

        // Calibração do tamanho da fonte (escala 0.8 para paridade com o navegador)
        let fontSizeMm = (style.fontSize || 24) * pxToMm * 0.82;
        let pdfFontSizePt = fontSizeMm / 0.3527; 
        pdf.setFontSize(pdfFontSizePt);

        // 3. Verificação de Transbordo (Auto-Scaling)
        const hOffset = (style.paddingLeft || 0) * pxToMm;
        const vOffset = (style.paddingTop || 0) * pxToMm;
        const maxWidth = boxW - Math.abs(hOffset) - 2;

        let currentTextWidth = pdf.getTextWidth(String(text));
        while (currentTextWidth > maxWidth && pdfFontSizePt > 6) {
            pdfFontSizePt -= 1;
            pdf.setFontSize(pdfFontSizePt);
            currentTextWidth = pdf.getTextWidth(String(text));
        }

        // 4. Lógica de Alinhamento Horizontal
        let drawX = boxX + hOffset;
        let align: 'left' | 'center' | 'right' = 'left';

        if (style.textAlign === 'center') {
            drawX = boxX + hOffset + (boxW - hOffset) / 2;
            align = 'center';
        } else if (style.textAlign === 'right') {
            drawX = boxX + boxW - 1;
            align = 'right';
        } else {
            drawX = boxX + hOffset + 1;
        }

        // 5. Alinhamento Vertical Preciso
        // Ajuste visual proporcional ao tamanho da fonte + offset manual solicitado
        const verticalVisualAdjustment = (pdfFontSizePt * 0.3527) * 0.15;
        const additionalManualOffset = manualOffsetPx * pxToMm; 
        const drawY = boxY + vOffset + (boxH - vOffset) / 2 + verticalVisualAdjustment + additionalManualOffset;

        try {
            pdf.text(
                String(text),
                drawX,
                drawY,
                { 
                    align: align,
                    baseline: 'middle'
                }
            );
        } catch (err) {
            console.error("Erro no texto do PDF:", err);
        }
    };

    const backgroundCache: Record<string, string> = {};

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        if (i > 0 && i % totalPerPage === 0) pdf.addPage();

        const pos = i % totalPerPage;
        const col = pos % badgesPerLine;
        const row = Math.floor(pos / badgesPerLine);

        const x = marginX + col * (badgeWidth + gapX);
        const y = marginY + row * (badgeHeight + gapY);

        const studentModel = models.find(m => m.id === student.modeloId);
        const currentBackground = studentModel?.fundoCrachaUrl || fallbackBackground;
        const currentStyle = studentModel?.badgeStyle || fallbackStyle;

        // Renderizar Fundo do Crachá
        try {
            if (!backgroundCache[currentBackground]) {
                backgroundCache[currentBackground] = await toDataURL(currentBackground);
            }
            pdf.addImage(backgroundCache[currentBackground], 'JPEG', x, y, badgeWidth, badgeHeight);
        } catch (e) {
            console.error("Erro fundo PDF:", e);
        }

        // Foto do Aluno
        if (student.fotoUrl) {
          try {
            const photoData = await toDataURL(student.fotoUrl);
            const px = x + (currentStyle.photo.x || 0) * pxToMm;
            const py = y + (currentStyle.photo.y || 0) * pxToMm;
            const pw = (currentStyle.photo.width || 100) * pxToMm;
            const ph = (currentStyle.photo.height || 100) * pxToMm;
            
            pdf.addImage(photoData, 'JPEG', px, py, pw, ph);

            if (currentStyle.photo.hasBorder && (currentStyle.photo.borderWidth || 0) > 0) {
                const borderRgb = hexToRgb(currentStyle.photo.borderColor);
                if (borderRgb) {
                    pdf.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
                    pdf.setLineWidth((currentStyle.photo.borderWidth || 1) * pxToMm);
                    pdf.roundedRect(px, py, pw, ph, (currentStyle.photo.borderRadius || 0) * pxToMm, (currentStyle.photo.borderRadius || 0) * pxToMm, 'S');
                }
            }
          } catch (e) {
            console.error("Erro foto PDF:", student.nome, e);
          }
        }

        // Aplicação dos offsets solicitados: Nome (+7px) e Turma (0px)
        renderTextOnPdf(student.nome, currentStyle.name, x, y, 7);
        
        // Sincroniza o tamanho da fonte da Turma com o do Nome para o PDF conforme solicitado
        const turmaStyleSincronizado = { 
            ...currentStyle.turma, 
            fontSize: currentStyle.name.fontSize 
        };
        renderTextOnPdf(student.turma, turmaStyleSincronizado, x, y, 0);
        
        if (currentStyle.customFields) {
            currentStyle.customFields.forEach(field => {
                const val = student.customData?.[field.id];
                if (val) renderTextOnPdf(val, field, x, y, 0);
            });
        }
    }
    
    pdf.save('crachas-estudantes.pdf');
};