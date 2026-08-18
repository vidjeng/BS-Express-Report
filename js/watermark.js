/**
 * Watermark processor using HTML5 Canvas
 * Stamps photo with BS Express Branch, Date, and Time metadata
 */

const WatermarkUtil = {
  /**
   * Processes an image file and applies watermark
   * @param {File} file 
   * @param {Object} meta { branch, date, time }
   * @returns {Promise<string>} Base64 Data URL
   */
  async addWatermark(file, meta = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Limit max dimensions for performance and storage
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw original image
          ctx.drawImage(img, 0, 0, width, height);

          // Prepare watermark text
          const now = new Date();
          const branchName = meta.branch || 'BS Express Branch';
          const timeStr = meta.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = meta.date || now.toLocaleDateString('en-GB');

          // Badge dimensions
          const boxPadding = Math.max(12, Math.round(width * 0.02));
          const fontSize = Math.max(14, Math.round(width * 0.024));
          const lineHeight = fontSize * 1.35;
          const boxWidth = Math.max(220, Math.round(width * 0.38));
          const boxHeight = lineHeight * 3 + boxPadding * 1.5;

          const posX = width - boxWidth - boxPadding;
          const posY = height - boxHeight - boxPadding;

          // Semi-transparent background box
          ctx.fillStyle = 'rgba(15, 28, 63, 0.82)';
          ctx.beginPath();
          ctx.roundRect(posX, posY, boxWidth, boxHeight, 8);
          ctx.fill();

          // Left accent stripe
          ctx.fillStyle = '#f95700';
          ctx.beginPath();
          ctx.roundRect(posX, posY, 5, boxHeight, [8, 0, 0, 8]);
          ctx.fill();

          // Watermark text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${fontSize}px "Kantumruy Pro", system-ui, sans-serif`;
          ctx.fillText(`BS EXPRESS - សាខា ${branchName}`, posX + 14, posY + lineHeight);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = `normal ${fontSize * 0.88}px system-ui, sans-serif`;
          ctx.fillText(`📅 ${dateStr}  ⏰ ${timeStr}`, posX + 14, posY + lineHeight * 2);

          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${fontSize * 0.8}px system-ui, sans-serif`;
          ctx.fillText(`✓ ផ្ទៀងផ្ទាត់រួចរាល់ (Verified)`, posX + 14, posY + lineHeight * 2.8);

          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

if (typeof window !== 'undefined') {
  window.WatermarkUtil = WatermarkUtil;
}
