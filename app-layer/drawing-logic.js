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
let resizeObserver;

// 防抖函数避免频繁重绘
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize drawing logic
export function initDrawingLogic() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // 移除固定的尺寸设置，完全依赖CSS控制
    // 初始化时立即设置正确尺寸
    resizeCanvas();
    
    // 添加窗口大小变化监听（防抖处理）
    window.addEventListener('resize', debounce(resizeCanvas, 250));
    
    // 添加ResizeObserver监听容器大小变化
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === canvasContainer) {
                    // 使用防抖避免频繁重绘
                    debounce(resizeCanvas, 100)();
                }
            }
        });
        resizeObserver.observe(canvasContainer);
    }
    
    // Initialize drawing state
    drawingState = initPolygonDrawing(canvas, ctx);
    
    // Store drawing state on canvas for event handlers
    canvas.drawingState = drawingState;

    // Expose useful functions globally for export and external modules
    try {
        if (window) {
            window.resizeCanvas = resizeCanvas;
            window.redrawCanvas = redrawCanvas;
        }
    } catch (e) {
        // ignore in environments where window is not writable
    }
    
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
    
    // 初始禁用画布，等待图像导入
    canvas.style.cursor = 'not-allowed';
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // 让删除逻辑可被外部调用（如toolbar）
    window.deleteSelectedPolygons = deleteSelectedPolygons;
    
    console.log('Drawing logic initialized with adaptive canvas');
    return {
        canvas,
        ctx,
        drawingState
    };
}

// 改进的resizeCanvas函数 - 完全自适应
export function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;
    
    // 获取容器实际尺寸（减去内边距）
    const containerStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
    
    const displayWidth = Math.max(100, Math.floor(container.clientWidth - paddingX));
    const displayHeight = Math.max(100, Math.floor(container.clientHeight - paddingY));
    
    // 只在尺寸实际变化时更新，避免不必要的重绘
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // 保存画布比例和内容
        const previousWidth = canvas.width;
        const previousHeight = canvas.height;
        
        // 设置新的画布尺寸
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        // 保持画布CSS尺寸与属性一致
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        console.log(`Canvas resized from ${previousWidth}x${previousHeight} to ${displayWidth}x${displayHeight}`);
        
        // 重绘画布内容
        if (drawingState) {
            // 如果有导入的图像，需要重新绘制并保持位置
            if (drawingState.importedImage) {
                // 计算图像缩放比例
                const scaleX = displayWidth / previousWidth;
                const scaleY = displayHeight / previousHeight;
                
                // 调整图像偏移量以保持相对位置
                if (drawingState.draggedImageOffset) {
                    drawingState.draggedImageOffset.x *= scaleX;
                    drawingState.draggedImageOffset.y *= scaleY;
                }
            }
            
            redrawCanvas(ctx, canvas);
        }
    }
}

// Cleanup function to remove observers
export function cleanupDrawingLogic() {
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    window.removeEventListener('resize', debounce(resizeCanvas, 250));
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
                // Cancel current polygon or clear selection
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

// 导出防抖函数供其他模块使用
export { debounce };
