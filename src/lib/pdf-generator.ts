import jsPDF from 'jspdf';
import { type Student } from './types';

// These styles are based on the original script's preview logic
const previewStyles = {
    preview: { width: 400, height: 289 },
    foto: { left: 14, top: 107, width: 110, height: 142 },
    nome: { left: 136, top: 150, width: 238, height: 28, fontSize: 16 },
    turma: { left: 136, top: 200, width: 180, height: 24, fontSize: 14 },
};

// Helper function to load an image and return its data URL
// This is necessary because jsPDF can have issues with cross-origin images
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


export const generatePdf = async (students: Student[], backgroundUrl: string) => {
    // A4 dimensions in mm
    const a4 = { width: 210, height: 297 };
    const badgesPerLine = 2;
    const badgesPerColumn = 4;
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 10;
    const marginY = 10;
    const gapX = 5;
    const gapY = 5;

    const { preview, foto, nome, turma } = previewStyles;
    
    // Calculate badge dimensions based on A4 size and layout
    const badgeWidth = (a4.width - marginX * 2 - gapX * (badgesPerLine - 1)) / badgesPerLine;
    const badgeHeight = badgeWidth * (preview.height / preview.width);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

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

        const pxToMmX = badgeWidth / preview.width;
        const pxToMmY = badgeHeight / preview.height;

        // 1. Add Background
        pdf.addImage(backgroundDataUrl, 'PNG', x, y, badgeWidth, badgeHeight);

        // 2. Add Photo (with white border effect)
        const photoBorder = 0.5; // in mm
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(
            x + foto.left * pxToMmX - photoBorder,
            y + foto.top * pxToMmY - photoBorder,
            foto.width * pxToMmX + photoBorder * 2,
            foto.height * pxToMmY + photoBorder * 2,
            2, 2, 'F' // 2mm radius
        );
        
        const studentPhotoDataUrl = student.photo.startsWith('data:') ? student.photo : await toDataURL(student.photo);
        pdf.addImage(studentPhotoDataUrl, 'PNG', x + foto.left * pxToMmX, y + foto.top * pxToMmY, foto.width * pxToMmX, foto.height * pxToMmY);

        // Set up fonts and colors
        pdf.setTextColor('#2a4d7a');

        // 3. Add Name
        pdf.setFillColor(255, 255, 255, 0.7);
        pdf.roundedRect(
            x + nome.left * pxToMmX,
            y + nome.top * pxToMmY,
            nome.width * pxToMmX,
            nome.height * pxToMmY,
            1, 1, 'F'
        );
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(nome.fontSize); // Font size is now in points
        pdf.text(
            student.name,
            x + nome.left * pxToMmX + 1, // small padding
            y + nome.top * pxToMmY + (nome.height * pxToMmY) / 1.6,
            { maxWidth: nome.width * pxToMmX - 2, align: 'left' }
        );
        
        // 4. Add Class (Turma)
        pdf.setFillColor(255, 255, 255, 0.9);
        pdf.roundedRect(
            x + turma.left * pxToMmX,
            y + turma.top * pxToMmY,
            turma.width * pxToMmX,
            turma.height * pxToMmY,
            1, 1, 'F'
        );
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(turma.fontSize);
        pdf.text(
            student.turma,
            x + turma.left * pxToMmX + 1,
            y + turma.top * pxToMmY + (turma.height * pxToMmY) / 1.6,
            { maxWidth: turma.width * pxToMmX - 2, align: 'left' }
        );
    }
    
    pdf.save('crachas.pdf');
};
