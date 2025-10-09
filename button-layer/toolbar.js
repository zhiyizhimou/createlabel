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
    const deleteBtn = document.getElementById('delete-btn');
    const inferenceBtn = document.getElementById('inference-btn');
    const clearBtn = document.getElementById('clear-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    
    // Add active class to track current tool
    const toolButtons = [drawBtn, selectBtn, fillBtn, deleteBtn, inferenceBtn];
    
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
    
    // Function to enable/disable drawing tools with optional color
    function setDrawingToolsEnabled(enabled, color = null) {
        [drawBtn, selectBtn, fillBtn, inferenceBtn, clearBtn, exportBtn].forEach(btn => {
            if (btn) {
                btn.disabled = !enabled;
                if (enabled) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    
                    // Apply extracted color if provided
                    if (color) {
                        btn.style.backgroundColor = color;
                        btn.style.borderColor = color;
                        btn.style.color = getContrastColor(color); // Ensure text is readable
                    }
                } else {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    // Reset to default styles when disabled
                    btn.style.backgroundColor = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }
            }
        });
    }
    
    // Helper function to get contrasting text color
    function getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return white or black based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
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

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            // 调用全局删除逻辑
            if (!deleteBtn.disabled && window.appCanvas && window.appCanvas.drawingState) {
                // 复用 app-layer/drawing-logic.js 的 deleteSelectedPolygons
                if (window.deleteSelectedPolygons) {
                    window.deleteSelectedPolygons();
                }
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!clearBtn.disabled && confirm('确定要清空画布吗？')) {
                clearCanvas();
                // After clearing, reset button colors to default
                setDrawingToolsEnabled(false);
            }
        });
    }
    
    // Setup import/export with callback for enabling tools
    setupImportButton(canvas, (extractedColor) => {
        // This callback is called when image is successfully imported
        setDrawingToolsEnabled(true, extractedColor);
        
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