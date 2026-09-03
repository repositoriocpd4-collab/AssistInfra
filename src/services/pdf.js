import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateDemandPdf(demand, updates, user) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Carrega o brasão oficial
  let logoImg = null;
  try {
    const res = await fetch('/static/images/logo-cabecalho-brasao.png');
    if (res.ok) {
      const blob = await res.blob();
      logoImg = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Brasão não carregado:', err);
  }

  let y = margin;

  // 1. Cabeçalho Institucional
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', margin, y, 16, 16);
  }

  const textLeft = logoImg ? margin + 20 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(7, 29, 65); // #071d41
  doc.text('PREFEITURA MUNICIPAL DE ITAGUAÍ', textLeft, y + 4);

  doc.setFontSize(10);
  doc.setTextColor(0, 90, 156); // #005A9C
  doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', textLeft, y + 9);

  doc.setFontSize(9);
  doc.text('SUBSECRETARIA DE INFRAESTRUTURA', textLeft, y + 14);

  y += 20;

  // Linha azul divisora
  doc.setDrawColor(0, 90, 156);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // 2. Título Central e Metadados à Direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(7, 29, 65);
  doc.text('Demanda Concluída', margin, y + 5);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(102, 112, 133); // #667085
  doc.text(demand.school_name || '—', pageWidth - margin, y, { align: 'right' });
  doc.text(`Gerado em ${dateStr}`, pageWidth - margin, y + 4, { align: 'right' });
  doc.text(user?.name || '', pageWidth - margin, y + 8, { align: 'right' });

  y += 14;

  // 3. Seção: Dados da Demanda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(7, 29, 65);
  doc.text('Dados da demanda', margin, y);

  y += 2;
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  // Tabela de Dados em 2 colunas
  const dadosTable = [
    [
      { content: 'Código:\n' + demand.code, styles: { fontStyle: 'bold' } },
      { content: 'Status:\n' + demand.status, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Unidade Escolar:\n' + (demand.school_name || '—') },
      { content: 'Categoria:\n' + (demand.category || '—') },
    ],
    [
      { content: 'Prioridade:\n' + (demand.priority || '—') },
      { content: 'Responsável:\n' + (demand.responsible || '—') },
    ],
    [
      { content: 'Prazo:\n' + (demand.due_date ? demand.due_date.slice(0, 16).replace('T', ' ') : '—') },
      { content: 'Setor:\n' + (demand.sector || '—') },
    ],
  ];

  if (demand.cost_estimate) {
    dadosTable.push([
      { content: 'Custo estimado:\nR$ ' + Number(demand.cost_estimate).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
      { content: 'Tipo de providência:\n' + (demand.prov_action_type || '—') },
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: dadosTable,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      cellPadding: 2.5,
      overflow: 'linebreak',
    },
  });

  y = doc.lastAutoTable.finalY + 4;

  // Título e Descrição
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(102, 112, 133);
  doc.text('Título', margin, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(7, 29, 65);
  doc.text(demand.title || '—', margin, y);
  y += 6;

  if (demand.description) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(102, 112, 133);
    doc.text('Descrição / objeto da demanda', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const descLines = doc.splitTextToSize(demand.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 4.5 + 4;
  }

  // 4. Seção: Histórico de Andamentos
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(7, 29, 65);
  doc.text('Histórico de andamentos', margin, y);

  y += 2;
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  if (!updates || updates.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Nenhum andamento registrado.', margin, y);
  } else {
    // Histórico ordenado
    const histData = updates.map((u) => {
      const dStr = u.created_at ? u.created_at.slice(0, 16).replace('T', ' às ') : '—';
      return [
        {
          content: `${dStr}  ·  ${u.kind || 'Andamento'}  ·  ${u.author || 'Sistema'}\n${u.message || ''}`,
          styles: { fontStyle: 'normal' },
        },
      ];
    });

    autoTable(doc, {
      startY: y,
      body: histData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: {
        fontSize: 9,
        textColor: [50, 50, 50],
        cellPadding: 3,
        lineColor: [230, 230, 230],
        lineWidth: { bottom: 0.2 },
      },
    });
  }

  // 5. Rodapé numerado em todas as páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(102, 112, 133);
    doc.text(
      'Agenda Integrada · Secretaria Municipal de Educação · Prefeitura Municipal de Itaguaí',
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  doc.save(`demanda_${demand.code}.pdf`);
}
