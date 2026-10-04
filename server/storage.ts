import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'documents');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function createRealSampleXlsxBuffer(version = 1): Buffer {
  const wb = XLSX.utils.book_new();

  const balanceData = version === 1 ? [
    ['EMPRESA S.A. - ESTADO DE SITUACIÓN FINANCIERA (Q3 2026)', '', '', ''],
    ['Cifras en USD', '', '', ''],
    ['', '', '', ''],
    ['CUENTA', 'Q1 2026', 'Q2 2026', 'Q3 2026'],
    ['Efectivo y Equivalentes', 450000, 520000, 610000],
    ['Cuentas por Cobrar Comerciales', 320000, 310000, 290000],
    ['Inventarios y Existencias', 180000, 210000, 240000],
    ['TOTAL ACTIVO CORRIENTE', 950000, 1040000, 1140000],
    ['Propiedad, Planta y Equipo', 850000, 840000, 830000],
    ['Activos Intangibles y Software', 120000, 140000, 160000],
    ['TOTAL ACTIVO TOTAL', 1920000, 2020000, 2130000],
    ['', '', '', ''],
    ['Cuentas por Pagar', 210000, 195000, 180000],
    ['Obligaciones Financieras', 400000, 380000, 350000],
    ['TOTAL PASIVO', 610000, 575000, 530000],
    ['PATRIMONIO NETO', 1310000, 1445000, 1600000],
  ] : [
    ['EMPRESA S.A. - ESTADO DE SITUACIÓN FINANCIERA (Q3 2026 - REVISIÓN V2)', '', '', ''],
    ['Cifras en USD - Ajuste por Auditoría Externa', '', '', ''],
    ['', '', '', ''],
    ['CUENTA', 'Q1 2026', 'Q2 2026', 'Q3 2026'],
    ['Efectivo y Equivalentes', 450000, 520000, 635000], // Updated
    ['Cuentas por Cobrar Comerciales', 320000, 310000, 285000], // Updated
    ['Inventarios y Existencias', 180000, 210000, 240000],
    ['TOTAL ACTIVO CORRIENTE', 950000, 1040000, 1160000], // Updated
    ['Propiedad, Planta y Equipo', 850000, 840000, 830000],
    ['Activos Intangibles y Software', 120000, 140000, 175000], // Updated
    ['TOTAL ACTIVO TOTAL', 1920000, 2020000, 2165000], // Updated
    ['', '', '', ''],
    ['Cuentas por Pagar', 210000, 195000, 175000], // Updated
    ['Obligaciones Financieras', 400000, 380000, 350000],
    ['TOTAL PASIVO', 610000, 575000, 525000],
    ['PATRIMONIO NETO', 1310000, 1445000, 1640000], // Updated
  ];

  const kpisData = [
    ['INDICADOR FINANCIERO', 'META', 'ACTUAL', 'ESTADO'],
    ['Margen Operativo', '22.0%', '24.8%', 'Superado'],
    ['Razón Corriente (Liquidez)', '1.50', '2.15', 'Óptimo'],
    ['Rotación de Inventarios (Días)', '45 días', '38 días', 'Óptimo'],
    ['Endeudamiento sobre Activo', '< 35%', '24.5%', 'Excelente'],
  ];

  const wsBalance = XLSX.utils.aoa_to_sheet(balanceData);
  const wsKpis = XLSX.utils.aoa_to_sheet(kpisData);

  XLSX.utils.book_append_sheet(wb, wsBalance, 'Balance General');
  XLSX.utils.book_append_sheet(wb, wsKpis, 'Indicadores KPI');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function createSamplePdfBuffer(): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 265 >>
stream
BT
/F1 16 Tf
50 720 Td
(CONTRATO MARCO DE PRESTACION DE SERVICIOS TECNOLOGICOS) Tj
/F1 11 Tf
0 -30 Td
(EMPRESA S.A. & PROVEEDOR TECNOLOGICO ASOCIADO - EJERCICIO 2026) Tj
0 -25 Td
(Clausula Primera: Objeto. El proveedor se compromete a suministrar los servicios de) Tj
0 -18 Td
(soporte en la nube, seguridad perimetral y gestion documental de alta disponibilidad.) Tj
0 -25 Td
(Clausula Segunda: Plazos y Entregables. Los reportes tecnicos mensuales seran) Tj
0 -18 Td
(presentados dentro de los primeros 5 dias habiles posteriores al cierre de cada mes.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000059 00000 n 
0000000116 00000 n 
0000000245 00000 n 
0000000560 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
630
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

export function ensureSampleFilesExist(): {
  pdfFile: string;
  docxFile: string;
  xlsxFile: string;
} {
  const pdfPath = path.join(STORAGE_DIR, 'doc_sample_contrato.pdf');
  const docxPath = path.join(STORAGE_DIR, 'doc_sample_politica.docx');
  const xlsxPath = path.join(STORAGE_DIR, 'doc_sample_balance.xlsx');

  // Always write valid sample files
  fs.writeFileSync(pdfPath, createSamplePdfBuffer());
  fs.writeFileSync(xlsxPath, createRealSampleXlsxBuffer(1));

  // Sample structured docx / text
  if (!fs.existsSync(docxPath)) {
    fs.writeFileSync(
      docxPath,
      Buffer.from(
        'MANUAL CORPORATIVO DE POLÍTICAS DE SEGURIDAD DE LA INFORMACIÓN\n\n' +
        '1. OBJETIVO Y ALCANCE\n' +
        'Establecer las directrices de custodia, clasificación y retención documental para todos los colaboradores de la empresa.\n\n' +
        '2. CONTROL DE ACCESOS Y ROLES\n' +
        'Todo documento clasificado como Confidencial solo podrá ser accedido por personal debidamente autorizado por la Administración.\n\n' +
        '3. CONTROL DE VERSIONES Y REVISIÓN\n' +
        'Toda modificación a un documento oficial debe generar un nuevo número de versión con su respectiva justificación de cambios.\n\n' +
        '4. VIGENCIA\n' +
        'Aprobado en Asamblea General de Accionistas. Vigencia indefinida sujeta a auditorías anuales.',
        'utf-8'
      )
    );
  }

  return {
    pdfFile: pdfPath,
    docxFile: docxPath,
    xlsxFile: xlsxPath,
  };
}
