import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';

export async function extractText(file) {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype || '';

  if (name.endsWith('.pdf') || mime === 'application/pdf') {
    try {
      const result = await pdfParse(file.buffer);
      return result.text;
    } catch (error) {
      console.warn(`PDF parsing failed for ${file.originalname}, attempting fallback:`, error.message);
      // Fallback: try to extract text as raw buffer if PDF parsing fails
      try {
        return file.buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, '');
      } catch (_) {
        throw new Error(`Unable to extract text from PDF: ${error.message}. File may be corrupted.`);
      }
    }
  }

  if (name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  // Excel spreadsheets — flatten every sheet to CSV-style text.
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
    const mod = await import('xlsx');
    const XLSX = mod.default || mod;
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    return workbook.SheetNames.map((sheetName) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      return `# Sheet: ${sheetName}\n${csv}`;
    }).join('\n\n');
  }

  if (name.endsWith('.csv') || mime.includes('csv')) {
    const rows = parse(file.buffer.toString('utf8'), { skip_empty_lines: true, relax_column_count: true });
    return rows.map((row) => row.join(' | ')).join('\n');
  }

  // Images — run OCR so printed schedules, notices, etc. become readable text.
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(name)) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      try {
        const { data } = await worker.recognize(file.buffer);
        return (data.text || '').trim();
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.warn(`Image OCR failed for ${file.originalname}:`, error.message);
      throw new Error('Could not read text from this image. Please try a clearer image or a PDF.');
    }
  }

  return file.buffer.toString('utf8');
}
