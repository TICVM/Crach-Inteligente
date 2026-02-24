import jsPDF from 'jspdf';
import { type Student } from './types';

// These styles are based on a 1063x768 design
const previewStyles = {
    preview: { width: 1063, height: 768 },
    foto: { left: 38, top: 285, width: 292, height: 376 },
    nome: { left: 468, top: 411, width: 436, height: 49, fontSize: 30 },
    turma: { left: 468, top: 517, width: 298, height: 49, fontSize: 30 },
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
        const photoBorder = 1; // in mm
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(
            x + foto.left * pxToMmX - photoBorder,
            y + foto.top * pxToMmY - photoBorder,
            foto.width * pxToMmX + photoBorder * 2,
            foto.height * pxToMmY + photoBorder * 2,
            3, 3, 'F' // 3mm radius
        );
        
        const studentPhotoDataUrl = student.photo.startsWith('data:') ? student.photo : await toDataURL(student.photo);
        pdf.addImage(studentPhotoDataUrl, 'PNG', x + foto.left * pxToMmX, y + foto.top * pxToMmY, foto.width * pxToMmX, foto.height * pxToMmY);

        // Set up font for text
        pdf.setFont('helvetica', 'bold');

        // 3. Add Name
        // Name Background
        pdf.setFillColor(255, 255, 255, 0.85);
        pdf.roundedRect(x + nome.left * pxToMmX, y + nome.top * pxToMmY, nome.width * pxToMmX, nome.height * pxToMmY, 2, 2, 'F');
        // Name Text
        pdf.setTextColor(42, 77, 122); // #2a4d7a
        pdf.setFontSize(nome.fontSize * pxToMmX * 2.5); // Adjust font size based on scale
        const namePaddingX = 15 * pxToMmX;
        pdf.text(
            student.name,
            x + nome.left * pxToMmX + namePaddingX,
            y + (nome.top + nome.height / 2) * pxToMmY,
            { maxWidth: nome.width * pxToMmX - (namePaddingX * 2), align: 'left', baseline: 'middle' }
        );
        
        // 4. Add Class (Turma)
        // Turma Background
        pdf.setFillColor(255, 255, 255, 0.85);
        pdf.roundedRect(x + turma.left * pxToMmX, y + turma.top * pxToMmY, turma.width * pxToMmX, turma.height * pxToMmY, 2, 2, 'F');
        // Turma Text
        pdf.setTextColor(42, 77, 122); // #2a4d7a
        pdf.setFontSize(turma.fontSize * pxToMmX * 2.5); // Adjust font size
        const turmaPaddingX = 15 * pxToMmX;
        pdf.text(
            student.turma,
            x + turma.left * pxToMmX + turmaPaddingX,
            y + (turma.top + turma.height / 2) * pxToMmY,
            { maxWidth: turma.width * pxToMmX - (turmaPaddingX * 2), align: 'left', baseline: 'middle' }
        );
    }
    
    pdf.save('crachas.pdf');
};
