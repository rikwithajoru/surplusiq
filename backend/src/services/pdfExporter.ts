import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { AnalyticsResult } from './analyticsService';

export class PDFExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFExportError';
  }
}

export async function generateCSRReport(analytics: AnalyticsResult): Promise<Buffer> {
  try {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    const stream = new PassThrough();
    doc.pipe(stream);
    stream.on('data', (chunk) => chunks.push(chunk));

    const today = new Date().toISOString().slice(0, 10);

    doc.fontSize(20).text('CSR Impact Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report Generation Date: ${today}`);
    doc.moveDown();
    doc.text(`Total Food Saved: ${analytics.totalKgSaved} kg`);
    doc.text(`Number of Donations: ${analytics.totalDonations}`);
    doc.text(`Estimated People Fed: ${analytics.estimatedPeopleFed}`);
    doc.text(`Estimated CO2 Reduced: ${analytics.estimatedCO2Reduced} kg`);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    return Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof PDFExportError) throw err;
    throw new PDFExportError(
      err instanceof Error ? err.message : 'Failed to generate PDF report'
    );
  }
}
