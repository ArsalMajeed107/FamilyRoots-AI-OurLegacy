import { jsPDF } from 'jspdf';
import { FamilyBranch, FamilyMember } from '../types/family';
import { generationLabel } from './genealogyUtils';

export function exportFamilyTreePdf(
  members: FamilyMember[],
  branches: FamilyBranch[],
  selectedBranchId?: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;

  const filtered = selectedBranchId
    ? members.filter((m) => m.branchId === selectedBranchId)
    : members;

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const branchName = selectedBranchId
    ? branches.find((b) => b.id === selectedBranchId)?.name || 'Selected Branch'
    : 'All Family Branches';

  // Navy header band
  doc.setFillColor(15, 35, 66);
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setFillColor(201, 154, 46);
  doc.rect(0, 88, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('OurLegacy — FamilyRoots AI Chronicle', margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.text(
    `Scope: ${branchName}  |  Verified Members: ${filtered.length}  |  Exported: ${new Date().toLocaleDateString()}`,
    margin,
    64,
  );

  let y = 120;
  const maxGen = filtered.length > 0 ? Math.max(...filtered.map((m) => m.generation)) : 0;

  for (let gen = 0; gen <= maxGen; gen++) {
    const tierMembers = filtered.filter((m) => m.generation === gen);
    if (tierMembers.length === 0) continue;

    if (y > pageHeight - 100) {
      doc.addPage();
      y = 54;
    }

    doc.setFillColor(241, 244, 249);
    doc.rect(margin, y - 14, pageWidth - margin * 2, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 35, 66);
    doc.text(generationLabel(gen), margin + 8, y);
    y += 22;

    for (const member of tierMembers) {
      if (y > pageHeight - 70) {
        doc.addPage();
        y = 54;
      }

      const father = member.fatherId ? memberMap.get(member.fatherId)?.fullName : member.fatherNameText;
      const mother = member.motherId ? memberMap.get(member.motherId)?.fullName : member.motherNameText;
      const spouse = member.spouseId ? memberMap.get(member.spouseId)?.fullName : '';

      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 35, 66);
      doc.text(member.fullName, margin + 8, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const metaParts = [
        member.gender.toUpperCase(),
        member.dateOfBirth ? `Born ${member.dateOfBirth}` : 'DOB unrecorded',
        member.branchName || 'Founding Lineage',
        member.roleInLineage,
      ];
      doc.text(metaParts.join(' · '), margin + 8, y + 13);

      const relParts: string[] = [];
      if (father) relParts.push(`Father: ${father}`);
      if (mother) relParts.push(`Mother: ${mother}`);
      if (spouse) relParts.push(`Spouse: ${spouse}`);
      if (relParts.length > 0) {
        doc.setTextColor(140, 104, 20);
        doc.text(relParts.join('  |  '), margin + 8, y + 25);
        y += 40;
      } else {
        y += 28;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y - 6, pageWidth - margin, y - 6);
    }
    y += 10;
  }

  doc.save(`ourlegacy-family-tree-${new Date().toISOString().slice(0, 10)}.pdf`);
}
