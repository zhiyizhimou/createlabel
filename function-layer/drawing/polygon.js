// 多边形绘制功能模块
import { DrawingState } from './models.js';

/**
 * 全局绘图状态
 * @type {DrawingState}
 */
const drawingState = new DrawingState();

/**
 * 鼠标位置
 * @type {Object}
 * @property {number} x - 鼠标横坐标
 * @property {number} y - 鼠标纵坐标
 */
let mousePos = { x: 0, y: 0 };

/**
 * 当前悬停的顶点索引
 * @type {number}
 * @description -1表示没有悬停在任何顶点上
 */
let hoveredVertexIndex = -1;

// 状态显示元素
let coordinatesElement; // 坐标显示元素
let toolStatusElement;  // 工具状态显示元素
let helpTextElement;    // 帮助文本显示元素

/**
 * 初始化多边形绘制功能
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @returns {DrawingState} 绘图状态对象
 * @description 设置事件监听器并初始化绘图状态
 */
export function initPolygonDrawing(canvas, ctx) {
    // 获取状态显示元素
    coordinatesElement = document.getElementById('coordinates');
    toolStatusElement = document.getElementById('tool-status');
    helpTextElement = document.getElementById('help-text');
    
    // 鼠标移动事件处理
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // 更新坐标显示
        updateCoordinates(mousePos.x, mousePos.y);
        
        // 处理顶点移动
        if (drawingState.mode === 'move-vertex' && drawingState.dragStartPos) {
            drawingState.updateVertexPosition(mousePos.x, mousePos.y);
            redrawCanvas(ctx, canvas);
            return;
        }
        
        // 处理多边形拖动
        if (drawingState.mode === 'drag-polygon' && drawingState.dragStartPos) {
            drawingState.updateDraggedPolygon(mousePos.x, mousePos.y);
            redrawCanvas(ctx, canvas);
            return;
        }
        
        // 检查是否悬停在绘制模式下的第一个顶点上（用于闭合多边形）
        if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
            hoveredVertexIndex = drawingState.currentPolygon.isNearFirstVertex(mousePos.x, mousePos.y) ? 0 : -1;
            
            // 根据悬停状态更新帮助文本
            if (hoveredVertexIndex === 0 && drawingState.currentPolygon.vertices.length >= 3) {
                helpTextElement.textContent = '点击首个顶点闭合多边形';
            } else {
                helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
            }
        }
        
        // 检查选择模式下是否悬停在顶点上（用于编辑多边形）
        if (drawingState.mode === 'select' && drawingState.selectedPolygons.length === 1) {
            const polygon = drawingState.selectedPolygons[0];
            for (let i = 0; i < polygon.vertices.length; i++) {
                const v = polygon.vertices[i];
                if (Math.sqrt((mousePos.x - v.x) ** 2 + (mousePos.y - v.y) ** 2) <= 10) {
                    canvas.style.cursor = 'move'; // 设置移动光标
                    hoveredVertexIndex = i;
                    return;
                }
            }
            
            // 检查是否悬停在多边形上（用于拖动整个多边形）
            if (polygon.containsPoint(mousePos.x, mousePos.y)) {
                canvas.style.cursor = 'grab'; // 设置抓取光标
                hoveredVertexIndex = -1;
                return;
            }
            
            // 重置状态
            hoveredVertexIndex = -1;
            canvas.style.cursor = 'default';
        }
        
        // 重绘画布以显示悬停效果
        redrawCanvas(ctx, canvas);
    });
    
    // 鼠标抬起事件处理
    canvas.addEventListener('mouseup', (e) => {
        if (drawingState.mode === 'move-vertex') {
            drawingState.stopMovingVertex();
        } else if (drawingState.mode === 'drag-polygon') {
            drawingState.stopDraggingPolygon();
        }
    });
    
    // 将绘图状态关联到画布对象
    canvas.drawingState = drawingState;
    return drawingState;
}

/**
 * 更新坐标显示
 * @param {number} x - 横坐标
 * @param {number} y - 纵坐标
 * @description 在状态栏显示当前鼠标坐标
 */
function updateCoordinates(x, y) {
    if (coordinatesElement) {
        coordinatesElement.textContent = `坐标: ${Math.round(x)}, ${Math.round(y)}`;
    }
}

/**
 * 更新工具状态显示
 * @param {string} mode - 当前工具模式
 * @description 更新状态栏显示当前工具状态和帮助文本
 */
function updateToolStatus(mode) {
    if (toolStatusElement) {
        let statusText = '当前工具: ';
        switch (mode) {
            case 'draw':
                statusText += '绘制';
                break;
            case 'select':
                statusText += '选择';
                break;
            case 'fill':
                statusText += '填充';
                break;
            case 'move-vertex':
                statusText += '移动顶点';
                break;
            case 'drag-polygon':
                statusText += '移动多边形';
                break;
            default:
                statusText += mode;
        }
        toolStatusElement.textContent = statusText;
    }
    
    // 根据模式更新帮助文本
    if (helpTextElement) {
        switch (mode) {
            case 'draw':
                helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
                break;
            case 'select':
                helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
                break;
            case 'fill':
                helpTextElement.textContent = '点击多边形进行填充，使用颜色选择器更改颜色和透明度';
                break;
            case 'move-vertex':
                helpTextElement.textContent = '拖动顶点改变多边形形状';
                break;
            case 'drag-polygon':
                helpTextElement.textContent = '拖动多边形到新位置';
                break;
            default:
                helpTextElement.textContent = '';
        }
    }
}

/**
 * 启用多边形绘制模式
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @description 设置绘制模式并添加相应的事件监听器
 */
export function enablePolygonDrawing(canvas, ctx) {
    drawingState.mode = 'draw';
    canvas.style.cursor = 'crosshair'; // 设置十字光标
    
    // 更新状态显示
    updateToolStatus('draw');
    
    // 移除现有事件监听器
    canvas.removeEventListener('mousedown', handleDrawingMouseDown);
    canvas.removeEventListener('contextmenu', handleDrawingRightClick);
    
    // 添加绘制相关的事件监听器
    canvas.addEventListener('mousedown', handleDrawingMouseDown);
    canvas.addEventListener('contextmenu', handleDrawingRightClick);
    
    // 如果没有当前多边形，则开始一个新的
    if (!drawingState.currentPolygon) {
        drawingState.startNewPolygon();
    }
    
    // 初始绘制
    redrawCanvas(ctx, canvas);
}

/**
 * 处理绘制模式下的鼠标按下事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @description 添加顶点或闭合多边形
 */
function handleDrawingMouseDown(e) {
    if (e.button !== 0) return; // 只处理左键点击
    e.preventDefault();
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 如果悬停在第一个顶点上且至少有3个点，则闭合多边形
    if (hoveredVertexIndex === 0 && drawingState.currentPolygon.vertices.length >= 3) {
        drawingState.finishCurrentPolygon();
        drawingState.startNewPolygon();
        helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
    } else {
        // 添加新顶点
        drawingState.currentPolygon.addVertex(x, y);
    }
    
    // 重绘画布
    redrawCanvas(e.target.getContext('2d'), e.target);
}

/**
 * 处理绘制模式下的右键点击事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @description 完成当前多边形绘制
 */
function handleDrawingRightClick(e) {
    e.preventDefault(); // 阻止默认右键菜单
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 如果当前处于绘制模式且当前多边形有至少3个顶点，右键仍用于完成当前绘制
    if (drawingState.mode === 'draw' && drawingState.currentPolygon && drawingState.currentPolygon.vertices.length >= 3) {
        drawingState.finishCurrentPolygon();
        drawingState.startNewPolygon();

        // 更新帮助文本
        if (helpTextElement) helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';

        // 重绘画布
        redrawCanvas(e.target.getContext('2d'), e.target);
        return;
    }

    // 非绘制模式或未在绘制中时，尝试对右键点击的多边形进行填充
    const clickedPolygon = drawingState.getPolygonAt(x, y);
    if (clickedPolygon) {
        // 选中该多边形并填充当前颜色/透明度
        drawingState.clearSelection();
        clickedPolygon.isSelected = true;
        drawingState.selectedPolygons.push(clickedPolygon);

        // 应用当前颜色和透明度（drawingState 中应已存有 currentColor / currentOpacity）
        drawingState.fillSelectedPolygons(drawingState.currentColor, drawingState.currentOpacity);

        // 更新帮助文本
        if (helpTextElement) {
            helpTextElement.textContent = `已填充多边形，颜色: ${drawingState.currentColor}，透明度: ${Math.round(drawingState.currentOpacity * 100)}%`;
        }

        // 重绘画布
        redrawCanvas(e.target.getContext('2d'), e.target);
    }
}

/**
 * 在画布上绘制多边形
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Object} startPos - 起始位置
 * @description 在指定位置添加顶点并重绘画布
 */
export function drawPolygon(ctx, startPos) {
    if (drawingState.currentPolygon) {
        drawingState.currentPolygon.addVertex(startPos.x, startPos.y);
    } else {
        const polygon = drawingState.startNewPolygon();
        polygon.addVertex(startPos.x, startPos.y);
    }
    
    redrawCanvas(ctx, ctx.canvas);
}

/**
 * 重绘整个画布
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @description 清空画布并重新绘制所有元素（图像、多边形、选择框等）
 */
export function redrawCanvas(ctx, canvas) {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制导入的图像（如果存在）
    if (drawingState.importedImage) {
        const img = drawingState.importedImage;
        const offset = drawingState.draggedImageOffset;
        
        // 计算图像适应画布的宽高比
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        // 根据宽高比计算绘制尺寸和位置
        if (imgRatio > canvasRatio) {
            // 图像比画布更宽（相对于高度）
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetX = 0 + offset.x;
            offsetY = (canvas.height - drawHeight) / 2 + offset.y;
        } else {
            // 图像比画布更高（相对于宽度）
            drawHeight = canvas.height;
            drawWidth = canvas.height * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2 + offset.x;
            offsetY = 0 + offset.y;
        }
        
        // 绘制适当大小的图像
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    // 绘制所有已完成的多边形
    drawingState.polygons.forEach(polygon => {
        polygon.draw(ctx);
    });
    
    // 绘制当前正在绘制的多边形（如果在绘制模式）
    if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
        drawingState.currentPolygon.draw(ctx, true);
        
        // 绘制从最后一个顶点到鼠标位置的预览线
        if (drawingState.currentPolygon.vertices.length > 0) {
            const lastVertex = drawingState.currentPolygon.vertices[drawingState.currentPolygon.vertices.length - 1];
            
            ctx.beginPath();
            ctx.moveTo(lastVertex.x, lastVertex.y);
            ctx.setLineDash([5, 5]); // 设置虚线样式
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = '#999999';
            ctx.stroke();
            ctx.setLineDash([]); // 重置线条样式
            
            // 如果悬停在第一个顶点上，显示闭合预览
            if (hoveredVertexIndex === 0) {
                ctx.beginPath();
                ctx.arc(drawingState.currentPolygon.vertices[0].x, 
                        drawingState.currentPolygon.vertices[0].y, 
                        8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; // 半透明绿色
                ctx.fill();
            }
        }
    }
    
    // 绘制选择框（如果活动）
    if (drawingState.selectionRect) {
        ctx.beginPath();
        ctx.rect(
            drawingState.selectionRect.startX,
            drawingState.selectionRect.startY,
            drawingState.selectionRect.width,
            drawingState.selectionRect.height
        );
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([5, 5]); // 设置虚线样式
        ctx.stroke();
        ctx.setLineDash([]); // 重置线条样式
    }
}