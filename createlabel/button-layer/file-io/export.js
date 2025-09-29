// Export functionality for files
export function exportImage(canvas) {
    try {
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '正在导出图像...';
        }
        
        // Create a data URL representing the image
        const dataUrl = canvas.toDataURL('image/png');
        
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