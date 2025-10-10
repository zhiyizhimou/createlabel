// Export functionality for files
export function exportImage(canvas) {
    try {
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '正在导出图像...';
        }
        
        // To ensure hidden-tag polygons are included, draw everything to an offscreen canvas
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        const offCtx = off.getContext('2d');
        // Try to use redrawCanvas from polygon module if available
        try {
            // dynamic import-ish: redrawCanvas should be globally available via imports in app
            if (window && typeof window.appCanvas !== 'undefined') {
                // If redrawCanvas is exported globally, call it; otherwise fallback to drawing current visible canvas
                if (typeof window.redrawCanvas === 'function') {
                    window.redrawCanvas(offCtx, off, true);
                } else {
                    // fallback: copy current canvas pixels (includes visible ones)
                    offCtx.drawImage(canvas, 0, 0);
                }
            } else {
                offCtx.drawImage(canvas, 0, 0);
            }
        } catch (e) {
            // if anything goes wrong, fallback to current canvas
            offCtx.drawImage(canvas, 0, 0);
        }

        // Create a data URL representing the image
        const dataUrl = off.toDataURL('image/png');
        
        // Create a link element and trigger download
        const link = document.createElement('a');
        link.href = dataUrl;
        const filename = `drawing_${new Date().toISOString().slice(0, 10)}.png`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Update help text
        if (helpTextElement) {
            helpTextElement.textContent = `图像已导出为 "${filename}"`;
        }
    } catch (error) {
        console.error('Error exporting image:', error);
        alert('导出图像失败，请检查浏览器权限设置。');
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '导出图像失败，请检查浏览器权限设置';
        }
    }
}