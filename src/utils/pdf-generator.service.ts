import PDFDocument from 'pdfkit';
import fs from 'fs';

export class PDFGeneratorService {
  
  static async generateDefenseSchedule(defenses: any[], projectName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // En-tête
      doc.fontSize(20).text(`Planning des soutenances - ${projectName}`, 50, 50);
      doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 50, 80);
      
      // Tableau
      let yPosition = 120;
      
      doc.fontSize(14).text('Ordre', 50, yPosition);
      doc.text('Groupe', 100, yPosition);
      doc.text('Date', 200, yPosition);
      doc.text('Heure', 300, yPosition);
      doc.text('Lieu', 400, yPosition);
      
      yPosition += 20;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      
      defenses.forEach((defense, index) => {
        yPosition += 20;
        
        doc.fontSize(10)
           .text((index + 1).toString(), 50, yPosition)
           .text(defense.group.name, 100, yPosition)
           .text(defense.startTime.toLocaleDateString('fr-FR'), 200, yPosition)
           .text(defense.startTime.toLocaleTimeString('fr-FR'), 300, yPosition)
           .text(defense.location || 'À définir', 400, yPosition);
      });
      
      doc.end();
    });
  }

  static async generateAttendanceSheet(groups: any[], projectName: string, orderType: 'group' | 'alphabetical'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // En-tête
      doc.fontSize(20).text(`Feuille d'émargement - ${projectName}`, 50, 50);
      doc.fontSize(12).text(`Ordre: ${orderType === 'group' ? 'Par groupes' : 'Alphabétique'}`, 50, 80);
      
      let yPosition = 120;
      
      // En-têtes de colonnes
      doc.fontSize(12).text('Nom', 50, yPosition);
      doc.text('Prénom', 150, yPosition);
      doc.text('Groupe', 250, yPosition);
      doc.text('Signature', 350, yPosition);
      
      yPosition += 20;
      doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
      
      // Collecte des étudiants
      const students: any[] = [];
      groups.forEach(group => {
        group.members.forEach((student: any) => {
          students.push({ ...student, groupName: group.name });
        });
      });
      
      // Tri selon le type demandé
      if (orderType === 'alphabetical') {
        students.sort((a, b) => a.lastName.localeCompare(b.lastName));
      } else {
        students.sort((a, b) => a.groupName.localeCompare(b.groupName));
      }
      
      students.forEach(student => {
        yPosition += 25;
        
        doc.fontSize(10)
           .text(student.lastName, 50, yPosition)
           .text(student.firstName, 150, yPosition)
           .text(student.groupName, 250, yPosition);
           
        // Ligne pour signature
        doc.moveTo(350, yPosition + 10).lineTo(480, yPosition + 10).stroke();
      });
      
      doc.end();
    });
  }
}