/**
 * Export utilities for CSV and PDF generation
 */

export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  accessor: (row: T) => string | number;
}

export function exportToCSV<T = Record<string, unknown>>(filename: string, columns: ExportColumn<T>[], data: T[]) {
  const separator = ';';
  const header = columns.map(c => `"${c.header}"`).join(separator);
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.accessor(row);
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(separator)
  );

  const bom = '\uFEFF';
  const csv = bom + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToPDF<T = Record<string, unknown>>(title: string, columns: ExportColumn<T>[], data: T[]) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const rowHeight = 20;
  const headerHeight = 24;
  const colWidths = distributeWidths(columns.length, pageWidth - margin * 2);

  let yPos = 0;
  const pages: string[] = [];
  let currentPageContent = '';

  const startNewPage = () => {
    if (currentPageContent) {
      pages.push(wrapPage(currentPageContent, pageWidth, pageHeight, pages.length));
    }
    currentPageContent = '';
    yPos = margin;

    // Title
    currentPageContent += `<text x="${margin}" y="${yPos + 14}" font-size="16" font-weight="bold" fill="hsl(210,15%,15%)">${escSvg(title)}</text>`;
    yPos += 30;

    // Table header
    let xPos = margin;
    currentPageContent += `<rect x="${margin}" y="${yPos}" width="${pageWidth - margin * 2}" height="${headerHeight}" fill="hsl(210,20%,95%)" rx="2"/>`;
    columns.forEach((col, i) => {
      currentPageContent += `<text x="${xPos + 6}" y="${yPos + 16}" font-size="9" font-weight="600" fill="hsl(210,10%,40%)">${escSvg(col.header)}</text>`;
      xPos += colWidths[i];
    });
    yPos += headerHeight;
  };

  startNewPage();

  data.forEach((row) => {
    if (yPos + rowHeight > pageHeight - margin) {
      startNewPage();
    }

    let xPos = margin;
    columns.forEach((col, i) => {
      const val = String(col.accessor(row) ?? '—');
      const truncated = val.length > 30 ? val.slice(0, 28) + '…' : val;
      currentPageContent += `<text x="${xPos + 6}" y="${yPos + 14}" font-size="9" fill="hsl(210,10%,25%)">${escSvg(truncated)}</text>`;
      xPos += colWidths[i];
    });

    currentPageContent += `<line x1="${margin}" y1="${yPos + rowHeight - 1}" x2="${pageWidth - margin}" y2="${yPos + rowHeight - 1}" stroke="hsl(210,15%,90%)" stroke-width="0.5"/>`;
    yPos += rowHeight;
  });

  if (currentPageContent) {
    pages.push(wrapPage(currentPageContent, pageWidth, pageHeight, pages.length));
  }

  // For single page, use SVG directly; for multi-page, combine
  const finalSvg = pages.length === 1
    ? pages[0]
    : pages.map((p, i) => {
        const yOffset = i * pageHeight;
        return `<g transform="translate(0,${yOffset})">${extractContent(p)}</g>`;
      }).join('');

  const totalHeight = pages.length * pageHeight;
  const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${totalHeight}" style="font-family:Arial,sans-serif">${
    pages.length === 1 ? extractContent(pages[0]) : finalSvg
  }</svg>`;

  const blob = new Blob([wrapper], { type: 'image/svg+xml' });
  downloadBlob(blob, `${title.replace(/\s+/g, '_')}.svg`);

  // Open in new tab for printing as PDF
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 500);
    };
  }
}

function distributeWidths(count: number, totalWidth: number): number[] {
  const w = Math.floor(totalWidth / count);
  return Array.from({ length: count }, () => w);
}

function wrapPage(content: string, w: number, h: number, _index: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="font-family:Arial,sans-serif"><rect width="${w}" height="${h}" fill="white"/>${content}</svg>`;
}

function extractContent(svg: string): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return match ? match[1] : svg;
}

function escSvg(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
