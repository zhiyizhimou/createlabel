// Toolbar controller for UI interactions
import { initDrawingLogic, enableDrawing, enableSelectionMode, enableFillMode, clearCanvas } from '../app-layer/drawing-logic.js';
import { setupImportButton } from './file-io/import.js';
import { exportImage } from './file-io/export.js';

// Initialize toolbar
export function initToolbar() {
    // Initialize drawing logic
    const { canvas } = initDrawingLogic();
    
    // Get toolbar buttons
    const drawBtn = document.getElementById('draw-btn');
    const selectBtn = document.getElementById('select-btn');
    const fillBtn = document.getElementById('fill-btn');
    const inferenceBtn = document.getElementById('inference-btn');
    const clearBtn = document.getElementById('clear-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    
    // Add active class to track current tool
    const toolButtons = [drawBtn, selectBtn, fillBtn, inferenceBtn];
    
    // Store reference to canvas for external access
    window.appCanvas = canvas;
    
    // Helper function to set active button
    function setActiveButton(activeBtn) {
        toolButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    // Function to enable/disable drawing tools
    function setDrawingToolsEnabled(enabled) {
        [drawBtn, selectBtn, fillBtn, inferenceBtn, clearBtn, exportBtn].forEach(btn => {
            if (btn) {
                btn.disabled = !enabled;
                if (enabled) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                } else {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }
            }
        });
    }
    
    // Initially disable drawing tools (waiting for image import)
    setDrawingToolsEnabled(false);
    
    // Add event listeners
    if (drawBtn) {
        drawBtn.addEventListener('click', () => {
            if (!drawBtn.disabled) {
                enableDrawing();
                setActiveButton(drawBtn);
            }
        });
    }
    
    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            if (!selectBtn.disabled) {
                enableSelectionMode();
                setActiveButton(selectBtn);
            }
        });
    }
    
    if (fillBtn) {
        fillBtn.addEventListener('click', () => {
            if (!fillBtn.disabled) {
                enableFillMode();
                setActiveButton(fillBtn);
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!clearBtn.disabled && confirm('确定要清空画布吗？')) {
                clearCanvas();
                // After clearing, we might want to keep tools enabled if there's still an image
                // or disable them if the image was also cleared
                if (!canvas.drawingState || !canvas.drawingState.hasImage()) {
                    setDrawingToolsEnabled(false);
                }
            }
        });
    }
    
    // Setup import/export with callback for enabling tools
    setupImportButton(canvas, () => {
        // This callback is called when image is successfully imported
        setDrawingToolsEnabled(true);
        
        // Set draw as default active tool after import
        if (drawBtn && !drawBtn.disabled) {
            drawBtn.click();
        }
        
        // Update status message
        const statusElement = document.getElementById('tool-status');
        if (statusElement) {
            statusElement.textContent = '图像已导入，可以使用绘图工具';
        }
    });
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!exportBtn.disabled) {
                exportImage(canvas);
            }
        });
    }
    
    // Set import as the only initially enabled button
    if (importBtn) {
        importBtn.disabled = false;
        importBtn.style.opacity = '1';
        importBtn.style.cursor = 'pointer';
        
        // Add visual indicator that import is required first
        const helpText = document.getElementById('help-text') || document.createElement('div');
        if (!document.getElementById('help-text')) {
            helpText.id = 'help-text';
            helpText.style.padding = '10px';
            helpText.style.textAlign = 'center';
            helpText.style.color = '#666';
            document.querySelector('.toolbar').appendChild(helpText);
        }
        helpText.textContent = '请先导入图像开始绘图';
    }
    
    return {
        setDrawingToolsEnabled, // Export this function for external use
        canvas
    };
}

// Function to check if tools are enabled (for external modules)
export function areToolsEnabled() {
    const drawBtn = document.getElementById('draw-btn');
    return drawBtn ? !drawBtn.disabled : false;
}