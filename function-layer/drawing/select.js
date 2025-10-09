// 选择功能模块
import { redrawCanvas } from './polygon.js';

/**
 * 启用选择模式
 * @param {Object} drawingState - 绘图状态对象
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @description 设置选择模式并添加相应的事件监听器
 */
export function enableSelection(drawingState, canvas, ctx) {
    // 设置模式为选择
    drawingState.mode = 'select';
    canvas.style.cursor = 'default';
    
    // 更新状态栏
    const toolStatusElement = document.getElementById('tool-status');
    const helpTextElement = document.getElementById('help-text');
    
    if (toolStatusElement) {
        toolStatusElement.textContent = '当前工具: 选择';
    }
    
    if (helpTextElement) {
        helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
    }
    
    // 移除现有事件监听器
    canvas.removeEventListener('mousedown', handleSelectionMouseDown);
    canvas.removeEventListener('mousemove', handleSelectionMouseMove);
    canvas.removeEventListener('mouseup', handleSelectionMouseUp);
    
    // 添加选择相关的事件监听器
    canvas.addEventListener('mousedown', handleSelectionMouseDown);
    canvas.addEventListener('mousemove', handleSelectionMouseMove);
    canvas.addEventListener('mouseup', handleSelectionMouseUp);
    
    // 清除当前正在绘制的多边形
    drawingState.cancelCurrentPolygon();
    
    // 初始绘制
    redrawCanvas(ctx, canvas);
}

/**
 * 处理选择模式下的鼠标按下事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @description 处理多边形选择、顶点移动和选择框创建
 */
function handleSelectionMouseDown(e) {
    if (e.button !== 0) return; // 只处理左键点击
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const drawingState = e.target.drawingState;
    
    // 检查是否点击了多边形顶点
    if (drawingState.selectedPolygons.length === 1 && hoveredVertexIndex >= 0) {
        drawingState.startMovingVertex(drawingState.selectedPolygons[0], hoveredVertexIndex, x, y);
        return;
    }
    
    // 检查是否点击了已选中的多边形（用于拖动）
    if (drawingState.selectedPolygons.length === 1) {
        const polygon = drawingState.selectedPolygons[0];
        if (polygon.containsPoint(x, y)) {
            drawingState.startDraggingPolygon(x, y);
            return;
        }
    }
    
    // 开始选择框
    drawingState.selectionRect = {
        startX: x,
        startY: y,
        width: 0,
        height: 0,
        isActive: true
    };
    
    // 检查是否点击了多边形
    const clickedPolygon = drawingState.getPolygonAt(x, y);
    if (clickedPolygon) {
        // 如果按住Shift键，则添加到选择或取消选择
        if (e.shiftKey) {
            clickedPolygon.isSelected = !clickedPolygon.isSelected;
            if (clickedPolygon.isSelected) {
                drawingState.selectedPolygons.push(clickedPolygon);
            } else {
                const index = drawingState.selectedPolygons.indexOf(clickedPolygon);
                if (index !== -1) {
                    drawingState.selectedPolygons.splice(index, 1);
                }
            }
        } else {
            // 清除之前的选择并选择此多边形
            drawingState.clearSelection();
            clickedPolygon.isSelected = true;
            drawingState.selectedPolygons.push(clickedPolygon);
        }
        
        // 更新帮助文本
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = `已选择 ${drawingState.selectedPolygons.length} 个多边形`;
        }
        
        // 重绘画布
        redrawCanvas(e.target.getContext('2d'), e.target);
    } else if (!e.shiftKey) {
        // 如果没有按住Shift键且点击了空白区域，则清除选择
        drawingState.clearSelection();
        
        // 更新帮助文本
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
        }
        
        redrawCanvas(e.target.getContext('2d'), e.target);
    }
}

/**
 * 处理选择模式下的鼠标移动事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @description 处理顶点移动、多边形拖动和选择框更新
 */
function handleSelectionMouseMove(e) {
    const drawingState = e.target.drawingState;
    
    // 处理顶点移动
    if (drawingState.mode === 'move-vertex' && drawingState.dragStartPos) {
        drawingState.updateVertexPosition(e.clientX - e.target.getBoundingClientRect().left, 
                                         e.clientY - e.target.getBoundingClientRect().top);
        redrawCanvas(e.target.getContext('2d'), e.target);
        return;
    }
    
    // 处理多边形拖动
    if (drawingState.mode === 'drag-polygon' && drawingState.dragStartPos) {
        drawingState.updateDraggedPolygon(e.clientX - e.target.getBoundingClientRect().left, 
                                         e.clientY - e.target.getBoundingClientRect().top);
        redrawCanvas(e.target.getContext('2d'), e.target);
        return;
    }
    
    // 处理选择框
    if (!drawingState.selectionRect || !drawingState.selectionRect.isActive) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 更新选择框尺寸
    drawingState.selectionRect.width = x - drawingState.selectionRect.startX;
    drawingState.selectionRect.height = y - drawingState.selectionRect.startY;
    
    // 重绘画布
    redrawCanvas(e.target.getContext('2d'), e.target);
}

/**
 * 处理选择模式下的鼠标抬起事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @description 完成顶点移动、多边形拖动或选择框选择
 */
function handleSelectionMouseUp(e) {
    const drawingState = e.target.drawingState;
    
    // 停止移动顶点
    if (drawingState.mode === 'move-vertex') {
        drawingState.stopMovingVertex();
        return;
    }
    
    // 停止拖动多边形
    if (drawingState.mode === 'drag-polygon') {
        drawingState.stopDraggingPolygon();
        return;
    }
    
    if (!drawingState.selectionRect) return;
    
    // 如果选择框活动且有一定大小
    if (drawingState.selectionRect.isActive && 
        (Math.abs(drawingState.selectionRect.width) > 5 || 
         Math.abs(drawingState.selectionRect.height) > 5)) {
        
        // 标准化选择框坐标（确保左上角是起点）
        const selRect = {
            left: Math.min(drawingState.selectionRect.startX, drawingState.selectionRect.startX + drawingState.selectionRect.width),
            top: Math.min(drawingState.selectionRect.startY, drawingState.selectionRect.startY + drawingState.selectionRect.height),
            right: Math.max(drawingState.selectionRect.startX, drawingState.selectionRect.startX + drawingState.selectionRect.width),
            bottom: Math.max(drawingState.selectionRect.startY, drawingState.selectionRect.startY + drawingState.selectionRect.height)
        };
        
        // 如果没有按住Shift键，则清除之前的选择
        if (!e.shiftKey) {
            drawingState.clearSelection();
        }
        
        // 选择所有与选择框相交的多边形
        drawingState.polygons.forEach(polygon => {
            // 检查是否有任何顶点在选择框内
            const isInside = polygon.vertices.some(vertex => 
                vertex.x >= selRect.left && 
                vertex.x <= selRect.right && 
                vertex.y >= selRect.top && 
                vertex.y <= selRect.bottom
            );
            
            if (isInside && !polygon.isSelected) {
                polygon.isSelected = true;
                drawingState.selectedPolygons.push(polygon);
            }
        });
        
        // 更新帮助文本
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            if (drawingState.selectedPolygons.length > 0) {
                helpTextElement.textContent = `已选择 ${drawingState.selectedPolygons.length} 个多边形`;
            } else {
                helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
            }
        }
    }
    
    // 清除选择框
    drawingState.selectionRect = null;
    
    // 重绘画布
    redrawCanvas(e.target.getContext('2d'), e.target);
}

/**
 * 清除选择
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @description 清除所有选中的多边形并重绘画布
 */
export function clearSelection(ctx, canvas) {
    const drawingState = canvas.drawingState;
    drawingState.clearSelection();
    
    // 更新帮助文本
    const helpTextElement = document.getElementById('help-text');
    if (helpTextElement) {
        helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
    }
    
    redrawCanvas(ctx, canvas);
}