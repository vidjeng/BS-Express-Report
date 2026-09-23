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

          // Limit max dimensions for high performance and lightweight storage (enables unlimited uploads)
          const maxDim = meta.maxDim || 960;
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

          // Prepare watermark metadata
          const now = new Date();
          const branchName = meta.branch || 'BS Express';
          const timeStr = meta.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = meta.date || now.toLocaleDateString('en-GB');

          // Professional compact sizing
          const fontSize = Math.max(11, Math.min(16, Math.round(width * 0.015)));
          const subFontSize = Math.max(10, Math.round(fontSize * 0.82));
          const padX = Math.max(10, Math.round(fontSize * 0.85));
          const padY = Math.max(6, Math.round(fontSize * 0.55));
          const lineGap = Math.max(3, Math.round(fontSize * 0.28));
          const margin = Math.max(10, Math.round(width * 0.012));

          const line1 = `BS EXPRESS • សាខា ${branchName}`;
          const line2 = `${dateStr}  ${timeStr}  •  ✓ Verified`;

          // Measure text dynamically for perfect hug-fit
          ctx.font = `bold ${fontSize}px "Kantumruy Pro", "Khmer OS Siemreap", "Siemreap", system-ui, sans-serif`;
          const w1 = ctx.measureText(line1).width;

          ctx.font = `500 ${subFontSize}px "Kantumruy Pro", "Khmer OS Siemreap", "Siemreap", system-ui, sans-serif`;
          const w2 = ctx.measureText(line2).width;

          const contentWidth = Math.max(w1, w2);
          const boxWidth = Math.round(contentWidth + padX * 2 + 10);
          const boxHeight = Math.round(fontSize + subFontSize + lineGap + padY * 2);

          const posX = width - boxWidth - margin;
          const posY = height - boxHeight - margin;

          // Sleek dark glassmorphism container
          ctx.save();
          ctx.fillStyle = 'rgba(10, 16, 32, 0.88)';
          ctx.beginPath();
          ctx.roundRect(posX, posY, boxWidth, boxHeight, 6);
          ctx.fill();

          // Subtle container border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Slim 3px left brand gradient accent bar (Red to Blue)
          const grad = ctx.createLinearGradient(posX, posY, posX, posY + boxHeight);
          grad.addColorStop(0, '#ef4444');
          grad.addColorStop(1, '#3b82f6');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(posX, posY, 3.5, boxHeight, [6, 0, 0, 6]);
          ctx.fill();

          // Text Line 1 (Header: Company & Branch)
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${fontSize}px "Kantumruy Pro", "Khmer OS Siemreap", "Siemreap", system-ui, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(line1, posX + padX + 6, posY + padY);

          // Text Line 2 (Metadata: Date, Time & Verification)
          ctx.fillStyle = '#38bdf8';
          ctx.font = `500 ${subFontSize}px "Kantumruy Pro", "Khmer OS Siemreap", "Siemreap", system-ui, sans-serif`;
          ctx.fillText(line2, posX + padX + 6, posY + padY + fontSize + lineGap);
          ctx.restore();

          const quality = typeof meta.quality === 'number' ? meta.quality : 0.72;
          resolve(canvas.toDataURL('image/jpeg', quality));
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
