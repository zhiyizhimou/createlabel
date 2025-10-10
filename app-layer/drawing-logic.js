// Drawing logic for the application
import { initPolygonDrawing, enablePolygonDrawing, redrawCanvas } from '../function-layer/drawing/polygon.js';
import { enableFill } from '../function-layer/drawing/fill.js';
import { enableSelection, clearSelection } from '../function-layer/drawing/select.js';
import { initColorPicker } from '../function-layer/color/color.js';
import { setupImportButton } from '../button-layer/file-io/import.js';
import { exportImage } from '../button-layer/file-io/export.js';

let canvas;
let ctx;
let drawingState;

// Initialize drawing logic
export function initDrawingLogic() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Initialize canvas size to match display size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize drawing state
    drawingState = initPolygonDrawing(canvas, ctx);
    
    // Store drawing state on canvas for event handlers
    canvas.drawingState = drawingState;
    
    // Initialize color picker
    initColorPicker(drawingState, canvas, ctx);
    
    // Setup import/export buttons (guard element existence)
    setupImportButton(canvas);
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportImage(canvas));
    }

    // Setup toolbar buttons (guard element existence to avoid runtime errors when HTML omits some controls)
    const drawBtn = document.getElementById('draw-btn');
    const selectBtn = document.getElementById('select-btn');
    const fillBtn = document.getElementById('fill-btn');
    const clearBtn = document.getElementById('clear-btn');

    if (drawBtn) {
        drawBtn.addEventListener('click', () => enableDrawing());
    }
    if (selectBtn) {
        selectBtn.addEventListener('click', () => enableSelectionMode());
    }
    if (fillBtn) {
        fillBtn.addEventListener('click', () => enableFillMode());
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => clearCanvas());
    }
    
    // Disable canvas initially
    canvas.style.cursor = 'not-allowed';
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // 让删除逻辑可被外部调用（如toolbar）
    window.deleteSelectedPolygons = deleteSelectedPolygons;
    return {
        canvas,
        ctx,
        drawingState
    };
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Prevent default for these keys to avoid browser shortcuts
        if (['Delete', 'Escape', 'd', 's', 'f'].includes(e.key)) {
            e.preventDefault();
        }
        
        switch (e.key) {
            case 'Delete':
                // Delete selected polygons
                if (drawingState.selectedPolygons.length > 0) {
                    deleteSelectedPolygons();
                }
                break;
            case 'Escape':
                // Cancel current polygon or clear selection`
                if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
                    drawingState.cancelCurrentPolygon();
                    drawingState.startNewPolygon();
                    redrawCanvas(ctx, canvas);
                } else if (drawingState.selectedPolygons.length > 0) {
                    drawingState.clearSelection();
                    redrawCanvas(ctx, canvas);
                }
                break;
            case 'd':
                // Drawing mode
                if (!e.ctrlKey && !e.metaKey) {
                    document.getElementById('draw-btn').click();
                }
                break;
            case 's':
                // Selection mode
                if (!e.ctrlKey && !e.metaKey) {
                    document.getElementById('select-btn').click();
                }
                break;
            case 'f':
                // Fill mode
                if (!e.ctrlKey && !e.metaKey) {
                    document.getElementById('fill-btn').click();
                }
                break;
        }
    });
}

// Delete selected polygons
function deleteSelectedPolygons() {
    if (drawingState.selectedPolygons.length === 0) return;
    
    // Remove selected polygons from the list
    drawingState.polygons = drawingState.polygons.filter(p => !p.isSelected);
    
    // Clear selection
    drawingState.clearSelection();
    
    // Update help text
    const helpTextElement = document.getElementById('help-text');
    if (helpTextElement) {
        helpTextElement.textContent = '已删除选中的多边形';
    }
    
    // Redraw canvas
    redrawCanvas(ctx, canvas);
}

// Resize canvas to match display size
export function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Check if the canvas size doesn't match display size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        // Redraw canvas if drawing state exists
        if (drawingState) {
            redrawCanvas(ctx, canvas);
        }
    }
}

// Enable drawing mode
export function enableDrawing() {
    // Require a selected tag before drawing
    if (!window.currentTag) {
        alert('请先选择一个标签再进行绘制');
        return;
    }

    // Ensure drawingState uses current tag color and opacity
    if (window.currentTag) {
        drawingState.currentColor = window.currentTag.color || drawingState.currentColor;
        if (typeof window.currentTag.opacity === 'number') {
            drawingState.currentOpacity = window.currentTag.opacity;
        }
    }

    enablePolygonDrawing(canvas, ctx);
}

// Enable selection mode
export function enableSelectionMode() {
    enableSelection(drawingState, canvas, ctx);
}

// Enable fill mode
export function enableFillMode() {
    enableFill(drawingState, canvas, ctx);
}

// Clear canvas
export function clearCanvas() {
    // Clear all polygons
    drawingState.polygons = [];
    drawingState.currentPolygon = null;
    drawingState.clearSelection();
    drawingState.importedImage = null;
    drawingState.draggedImageOffset = { x: 0, y: 0 };
    
    // Update help text
    const helpTextElement = document.getElementById('help-text');
    if (helpTextElement) {
        helpTextElement.textContent = '画布已清空';
    }
    
    // Redraw canvas
    redrawCanvas(ctx, canvas);
}