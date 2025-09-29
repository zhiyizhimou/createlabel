// Import functionality for files
import { redrawCanvas } from '../../function-layer/drawing/polygon.js';

// Global file input element and click handler
let fileInput = null;
let importButtonClickHandler = null;

export function importImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsDataURL(file);
    });
}

export function setupImportButton(canvas) {
    const importBtn = document.getElementById('import-btn');
    
    if (!importBtn) {
        console.warn('Import button not found');
        return;
    }
    
    // Remove existing click handler if any
    if (importButtonClickHandler) {
        importBtn.removeEventListener('click', importButtonClickHandler);
    }
    
    // Create file input only once
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // Update help text
                    const helpTextElement = document.getElementById('help-text');
                    if (helpTextElement) {
                        helpTextElement.textContent = '正在导入图像...';
                    }
                    
                    const imgData = await importImage(file);
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    img.onload = () => {
                        // Clear canvas first
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // Set imported image in drawing state
                        canvas.drawingState.setImportedImage(img);
                        canvas.drawingState.draggedImageOffset = { x: 0, y: 0 };
                        
                        // Enable drawing tools
                        document.getElementById('draw-btn').disabled = false;
                        document.getElementById('select-btn').disabled = false;
                        document.getElementById('fill-btn').disabled = false;
                        document.getElementById('clear-btn').disabled = false;
                        
                        // Redraw canvas
                        redrawCanvas(ctx, canvas);
                        
                        // Update help text
                        if (helpTextElement) {
                            helpTextElement.textContent = `图像 "${file.name}" 已导入，尺寸: ${img.width}x${img.height}`;
                        }
                    };
                    
                    img.onerror = (e) => {
                        console.error('Image loading error:', e);
                        alert('图像加载失败，请尝试其他图像。');
                        
                        // Update help text
                        if (helpTextElement) {
                            helpTextElement.textContent = '图像加载失败，请尝试其他图像';
                        }
                    };
                    
                    img.src = imgData;
                } catch (error) {
                    console.error('Import error:', error);
                    alert('导入图像失败，请检查文件格式。');
                    
                    // Update help text
                    const helpTextElement = document.getElementById('help-text');
                    if (helpTextElement) {
                        helpTextElement.textContent = '导入图像失败，请检查文件格式';
                    }
                }
            }
        });
    }
    
    // Create a new click handler and store reference
    importButtonClickHandler = () => {
        fileInput.value = ''; // Reset file input to allow selecting same file again
        fileInput.click();
    };
    
    // Add the click handler
    importBtn.addEventListener('click', importButtonClickHandler);
}

// Function to cleanup and remove event listeners
export function cleanupImportButton() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn && importButtonClickHandler) {
        importBtn.removeEventListener('click', importButtonClickHandler);
        importButtonClickHandler = null;
    }
    
    if (fileInput) {
        fileInput.remove();
        fileInput = null;
    }
}