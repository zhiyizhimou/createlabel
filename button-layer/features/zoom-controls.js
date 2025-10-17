// Zoom controls for UI
// 缩放功能模块
import { redrawCanvas } from '../../function-layer/drawing/polygon.js';

/**
 * 初始化缩放功能
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Object} drawingState - 绘图状态对象
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 */
export function initZoom(canvas, drawingState, ctx) {
    // 初始化缩放状态
    drawingState.scale = 1.0;
    drawingState.minScale = 0.1;
    drawingState.maxScale = 5.0;
    drawingState.zoomOrigin = { x: 0, y: 0 };
    
    // 添加鼠标滚轮事件监听
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    console.log('Zoom functionality initialized');
    
    return {
        setScale,
        resetZoom
    };
    
    /**
     * 处理鼠标滚轮事件
     * @param {WheelEvent} e - 滚轮事件
     */
    function handleWheel(e) {
        // 如果在绘制模式，禁用缩放
        if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
            return;
        }
        
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算缩放前的鼠标位置在世界坐标系中的位置
        const worldX = (mouseX - drawingState.zoomOrigin.x) / drawingState.scale;
        const worldY = (mouseY - drawingState.zoomOrigin.y) / drawingState.scale;
        
        // 计算缩放因子（滚轮向下缩小，向上放大）
        const zoomIntensity = 0.1;
        const wheelDelta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = 1 + wheelDelta * zoomIntensity;
        
        // 应用缩放限制
        const newScale = Math.max(drawingState.minScale, 
                                 Math.min(drawingState.maxScale, 
                                         drawingState.scale * zoomFactor));
        
        if (newScale !== drawingState.scale) {
            drawingState.scale = newScale;
            
            // 调整原点以使缩放以鼠标位置为中心
            drawingState.zoomOrigin.x = mouseX - worldX * drawingState.scale;
            drawingState.zoomOrigin.y = mouseY - worldY * drawingState.scale;
            
            // 重绘画布
            redrawCanvas(ctx, canvas);
            
            // 更新状态栏信息
            updateZoomStatus();
        }
    }
    
    /**
     * 设置缩放比例
     * @param {number} scale - 新的缩放比例
     */
    function setScale(scale) {
        const newScale = Math.max(drawingState.minScale, 
                                 Math.min(drawingState.maxScale, scale));
        if (newScale !== drawingState.scale) {
            drawingState.scale = newScale;
            redrawCanvas(ctx, canvas);
            updateZoomStatus();
        }
    }
    
    /**
     * 重置缩放
     */
    function resetZoom() {
        drawingState.scale = 1.0;
        drawingState.zoomOrigin = { x: 0, y: 0 };
        redrawCanvas(ctx, canvas);
        updateZoomStatus();
    }
    
    /**
     * 更新缩放状态显示
     */
    function updateZoomStatus() {
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = `缩放: ${Math.round(drawingState.scale * 100)}% (使用鼠标滚轮缩放)`;
        }
    }
}

/**
 * 应用缩放变换到绘图上下文
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Object} drawingState - 绘图状态对象
 */
export function applyZoomTransform(ctx, drawingState) {
    ctx.save();
    ctx.translate(drawingState.zoomOrigin.x, drawingState.zoomOrigin.y);
    ctx.scale(drawingState.scale, drawingState.scale);
}

/**
 * 恢复绘图上下文变换
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 */
export function restoreZoomTransform(ctx) {
    ctx.restore();
}

/**
 * 将屏幕坐标转换为世界坐标（考虑缩放和偏移）
 * @param {number} x - 屏幕X坐标
 * @param {number} y - 屏幕Y坐标
 * @param {Object} drawingState - 绘图状态对象
 * @returns {Object} 世界坐标 {x, y}
 */
export function screenToWorld(x, y, drawingState) {
    return {
        x: (x - drawingState.zoomOrigin.x) / drawingState.scale,
        y: (y - drawingState.zoomOrigin.y) / drawingState.scale
    };
}
