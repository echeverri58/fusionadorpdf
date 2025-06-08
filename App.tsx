
import React, { useState, useCallback, ChangeEvent } from 'react';
import { mergePdfs } from './services/pdfService';
import { LoadingSpinner } from './components/LoadingSpinner';

interface ProcessedFile {
  id: string;
  file: File;
  name: string;
}

// Simple X icon for removal
const XIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Simple Upload icon
const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3.75 12h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


const App: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<ProcessedFile[]>([]);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (files) {
      const newFiles: ProcessedFile[] = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(file => ({
          id: `${file.name}-${Date.now()}`, // Simple unique ID
          file,
          name: file.name,
        }));
      
      if (newFiles.length !== files.length) {
        setError("Algunos archivos no eran PDF y fueron ignorados.");
      }
      
      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        newFiles.forEach(nf => {
          if (!prevFiles.find(pf => pf.name === nf.name)) { // Avoid duplicates by name
            updatedFiles.push(nf);
          }
        });
        return updatedFiles;
      });
    }
    // Reset file input to allow selecting the same file again if removed
    event.target.value = '';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    setError(null);
    const files = event.dataTransfer.files;
    if (files) {
      const newFiles: ProcessedFile[] = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(file => ({
          id: `${file.name}-${Date.now()}`,
          file,
          name: file.name,
        }));
      
      if (newFiles.length !== files.length) {
        setError("Algunos archivos no eran PDF y fueron ignorados.");
      }

      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        newFiles.forEach(nf => {
          if (!prevFiles.find(pf => pf.name === nf.name)) {
            updatedFiles.push(nf);
          }
        });
        return updatedFiles;
      });
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);


  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
    if (mergedPdfUrl) setMergedPdfUrl(null); // Clear merged PDF if files change
  }, [mergedPdfUrl]);

  const handleMergePdfs = useCallback(async () => {
    if (selectedFiles.length < 2) {
      setError("Por favor, selecciona al menos dos archivos PDF para fusionar.");
      return;
    }
    setIsMerging(true);
    setError(null);
    setMergedPdfUrl(null);

    try {
      const pdfFiles = selectedFiles.map(pf => pf.file);
      const mergedPdfBytes = await mergePdfs(pdfFiles);
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (err) {
      console.error("Fallo la fusión:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error desconocido durante la fusión.");
    } finally {
      setIsMerging(false);
    }
  }, [selectedFiles]);

  const handleDownloadMergedPdf = useCallback(() => {
    if (mergedPdfUrl) {
      const a = document.createElement('a');
      a.href = mergedPdfUrl;
      a.download = `documento_fusionado_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // URL.revokeObjectURL(mergedPdfUrl); // Keep URL for potential re-download until files change
    }
  }, [mergedPdfUrl]);

  const handleClearAll = useCallback(() => {
    setSelectedFiles([]);
    setMergedPdfUrl(null);
    setError(null);
    setIsMerging(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4 sm:p-8 flex flex-col items-center">
      <header className="w-full max-w-3xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
          Fusionador PDF Pro
        </h1>
        <p className="mt-3 text-slate-300 text-lg">
          Combina tus archivos PDF en uno solo, sin esfuerzo.
        </p>
      </header>

      <main className="w-full max-w-3xl bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 space-y-6">
        {/* File Input and Drag & Drop Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ease-in-out
            ${dragOver ? 'border-pink-500 bg-slate-700' : 'border-slate-600 hover:border-slate-500'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('fileInput')?.click()}
          role="button"
          tabIndex={0}
          aria-label="Área para soltar o seleccionar archivos PDF"
        >
          <input
            type="file"
            id="fileInput"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <UploadIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-300">
            Arrastra y suelta archivos PDF aquí, o <span className="font-semibold text-pink-400">haz clic para seleccionar</span>.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            <h2 className="text-lg font-semibold text-slate-200">Archivos Seleccionados:</h2>
            {selectedFiles.map((processedFile, index) => (
              <div
                key={processedFile.id}
                className="flex items-center justify-between bg-slate-700 p-3 rounded-md shadow"
              >
                <span className="text-sm text-slate-300 truncate pr-2">
                  {index + 1}. {processedFile.name}
                </span>
                <button
                  onClick={() => handleRemoveFile(processedFile.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label={`Eliminar ${processedFile.name}`}
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleMergePdfs}
            disabled={selectedFiles.length < 2 || isMerging}
            className="w-full sm:w-auto flex-grow justify-center px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out flex items-center space-x-2"
          >
            {isMerging ? <LoadingSpinner /> : (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25h-13.5A2.25 2.25 0 013 18V6.375c0-.621.504-1.125 1.125-1.125H7.5m0-3h7.5m-7.5 3H7.5m0-3C7.5 3.007 7.007 2.5 6.5 2.5S5.5 3.007 5.5 3.5v.75M12 15L12 19.5" />
              </svg>
            )}
            <span>{isMerging ? 'Fusionando...' : 'Fusionar PDFs'}</span>
          </button>

          {mergedPdfUrl && (
            <button
              onClick={handleDownloadMergedPdf}
              className="w-full sm:w-auto justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Descargar PDF Fusionado</span>
            </button>
          )}
        </div>
         { (selectedFiles.length > 0 || mergedPdfUrl) &&
            <button
              onClick={handleClearAll}
              className="w-full mt-4 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out flex items-center justify-center space-x-2"
              >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.88 5.79m2.184-3.21a48.108 48.108 0 013.478-.397m0 0L12 2.25L12 2.25m0 0l-2.014.205M12 2.25L12 14.25" />
              </svg>
              <span>Limpiar Todo</span>
            </button>
        }
      </main>
      <footer className="w-full max-w-3xl text-center mt-8 py-4">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Fusionador PDF Pro. Creado por John Alexander Echeverry Ocampo.
        </p>
      </footer>
    </div>
  );
};

export default App;
