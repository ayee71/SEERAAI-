/**
 * High-Performance Off-Main-Thread Document & Image Extraction Worker
 * Offloads heavy image scaling, contrast enhancement, base64 encoding,
 * and text parsing from the main UI thread.
 */

interface ProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  enhanceContrast?: boolean;
}

interface WorkerMessageData {
  type?: 'PROCESS_FILE' | 'PROCESS_IMAGE';
  file?: File;
  options?: ProcessOptions;
}

self.onmessage = async (e: MessageEvent<File | WorkerMessageData>) => {
  const startTime = performance.now();
  let file: File;
  let options: ProcessOptions = {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    enhanceContrast: true,
  };

  if (e.data instanceof File || (e.data && typeof (e.data as any).name === 'string' && (e.data as any).size)) {
    file = e.data as File;
  } else if (e.data && (e.data as WorkerMessageData).file) {
    file = (e.data as WorkerMessageData).file!;
    if ((e.data as WorkerMessageData).options) {
      options = { ...options, ...(e.data as WorkerMessageData).options };
    }
  } else {
    self.postMessage({ error: 'Invalid file payload provided to worker.' });
    return;
  }

  // Handle plain text files
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        self.postMessage({
          success: true,
          text,
          mimeType: 'text/plain',
          name: file.name,
          sizeBytes: file.size,
          processingTimeMs: Math.round(performance.now() - startTime),
        });
      };
      reader.onerror = () => self.postMessage({ error: 'Failed to read text file.' });
      reader.readAsText(file);
      return;
    } catch (err: any) {
      self.postMessage({ error: err.message || 'Error processing text file' });
      return;
    }
  }

  // For non-image files like PDFs, read as base64 without canvas resizing
  if (!file.type.startsWith('image/')) {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        self.postMessage({
          success: true,
          base64,
          mimeType: file.type || 'application/pdf',
          name: file.name,
          sizeBytes: file.size,
          processingTimeMs: Math.round(performance.now() - startTime),
        });
      };
      reader.onerror = () => self.postMessage({ error: 'Failed to process document file.' });
      reader.readAsDataURL(file);
      return;
    } catch (err: any) {
      self.postMessage({ error: err.message || 'Error processing document file' });
      return;
    }
  }

  // High-performance image processing using OffscreenCanvas & createImageBitmap
  try {
    self.postMessage({ type: 'PROGRESS', percent: 25, stage: 'decoding' });

    // Decode image bitmap off-main-thread
    const bitmap = await createImageBitmap(file);
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    // Calculate optimal dimensions preserving aspect ratio
    const maxWidth = options.maxWidth || 1600;
    const maxHeight = options.maxHeight || 1600;
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight);
      targetWidth = Math.round(origWidth * ratio);
      targetHeight = Math.round(origHeight * ratio);
    }

    self.postMessage({ type: 'PROGRESS', percent: 55, stage: 'resizing' });

    // Use OffscreenCanvas if supported
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not acquire 2D rendering context on OffscreenCanvas');
      }

      // Draw and resample image smoothly
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      // Optional contrast enhancement for legal document clarity
      if (options.enhanceContrast) {
        try {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;
          // Apply slight contrast stretch to sharpen dark text against light background
          const factor = 1.15; // 15% contrast boost
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128)); // B
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Non-fatal if pixel manipulation restricted
        }
      }

      self.postMessage({ type: 'PROGRESS', percent: 80, stage: 'encoding' });

      // Convert OffscreenCanvas to Blob
      const blob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: options.quality || 0.82,
      });

      // Convert Blob to Base64 off-thread
      const arrayBuffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);

      const processingTime = Math.round(performance.now() - startTime);

      self.postMessage({
        success: true,
        base64,
        mimeType: 'image/jpeg',
        name: file.name,
        width: targetWidth,
        height: targetHeight,
        originalSizeBytes: file.size,
        optimizedSizeBytes: blob.size,
        compressionRatio: Math.round((1 - (blob.size / file.size)) * 100),
        processingTimeMs: processingTime,
      });
    } else {
      // Fallback via FileReader
      bitmap.close();
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        self.postMessage({
          success: true,
          base64,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSizeBytes: file.size,
          processingTimeMs: Math.round(performance.now() - startTime),
        });
      };
      reader.readAsDataURL(file);
    }
  } catch (error: any) {
    // Graceful fallback to FileReader
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        self.postMessage({
          success: true,
          base64,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSizeBytes: file.size,
          processingTimeMs: Math.round(performance.now() - startTime),
        });
      };
      reader.onerror = () => self.postMessage({ error: 'Failed to process document image.' });
      reader.readAsDataURL(file);
    } catch (fbErr: any) {
      self.postMessage({ error: error.message || fbErr.message || 'Image processing failed' });
    }
  }
};
