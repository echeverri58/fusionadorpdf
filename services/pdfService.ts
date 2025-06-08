
// Ensure PDFLib is globally available from the CDN script in index.html
declare var PDFLib: any;

export const mergePdfs = async (files: File[]): Promise<Uint8Array> => {
  if (!PDFLib || !PDFLib.PDFDocument) {
    throw new Error('La librería PDF-lib no está cargada. Por favor, verifica tu conexión a internet o la inclusión del script.');
  }
  const { PDFDocument } = PDFLib;

  if (!files || files.length === 0) {
    throw new Error("No se proporcionaron archivos para fusionar.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    if (file.type !== 'application/pdf') {
        console.warn(`Omitiendo archivo no PDF: ${file.name}`);
        continue;
    }
    const arrayBuffer = await file.arrayBuffer();
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
        // Ignore errors for problematic PDFs if desired, though this might lead to issues.
        // For now, let it throw on critical errors.
        // ignoreEncryption: true, // Example: if you need to handle encrypted PDFs that allow copying
      });
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    } catch (error) {
      console.error(`Fallo al cargar o copiar páginas de ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}. Podría estar corrupto o protegido por contraseña sin permisos de copia.`);
    }
  }

  if (mergedPdf.getPageCount() === 0) {
    throw new Error("No se fusionaron páginas con éxito. Por favor, revisa tus archivos PDF.");
  }

  const mergedPdfBytes = await mergedPdf.save();
  return mergedPdfBytes;
};
