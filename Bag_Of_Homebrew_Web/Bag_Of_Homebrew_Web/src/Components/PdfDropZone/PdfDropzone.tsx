import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { uploadImage, imageSrc } from '../../api/images';

// Point pdf.js at its worker (matches the installed version automatically)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface Props {
  sheetUrl: string | null;
  onSheetChange: (url: string) => void;
}

export function PdfDropzone({ sheetUrl, onSheetChange }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scale, setScale] = useState(1);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please drop a PDF file.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, 'sheets'); // same helper, "sheets" kind
      onSheetChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Empty state: drop target
  if (!sheetUrl) {
    return (
      <div
        className={`pdf-dropzone ${dragOver ? 'pdf-dropzone--over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <p>{uploading ? 'Uploading…' : 'Drop character sheet PDF here'}</p>
        {error && <p className="pdf-dropzone__error">{error}</p>}
      </div>
    );
  }

  // Loaded state: scrollable document
  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <span className="pdf-viewer__pages">{numPages} page{numPages !== 1 ? 's' : ''}</span>
        <div className="pdf-viewer__zoom">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} disabled={scale <= 0.5}>−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.25))} disabled={scale >= 3}>+</button>
        </div>
        <button className="pdf-viewer__replace" onClick={() => onSheetChange('')}>
          Replace
        </button>
      </div>
      <div className="pdf-viewer__scroll">
        <Document
          file={imageSrc(sheetUrl)}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError('Could not load PDF.')}
          loading={<p className="pdf-viewer__loading">Loading…</p>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={340 * scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}