import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';

export async function extractText(file) {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype;

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

  if (name.endsWith('.csv') || mime.includes('csv')) {
    const rows = parse(file.buffer.toString('utf8'), { skip_empty_lines: true, relax_column_count: true });
    return rows.map((row) => row.join(' | ')).join('\n');
  }

  return file.buffer.toString('utf8');
}
