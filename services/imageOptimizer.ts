
const MAX_WIDTH = 1200;
const QUALITY = 0.8;

/**
 * Compresses and converts an image file to WebP format.
 * Mimics logic from optimize_images.py:
 * - Resizes to max width 1200px (maintaining aspect ratio)
 * - Converts to WebP
 * - Quality 80%
 */
export const compressImage = async (file: File): Promise<File> => {
  // Only process images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVG as they are vector and shouldn't be rasterized usually, 
  // or if user specifically wants to rasterize them, we can remove this check.
  // optimize_images.py supports jpg, jpeg, png, bmp, tiff.
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;
      
      // Resize if needed
      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = Math.floor(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw image to canvas (handles resizing)
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas compression failed'));
          return;
        }
        
        // Rename file to .webp
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        
        const newFile = new File([blob], newName, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        
        console.log(`Image compressed: ${file.size / 1024}KB -> ${newFile.size / 1024}KB`);
        resolve(newFile);
      }, 'image/webp', QUALITY);
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = url;
  });
};
