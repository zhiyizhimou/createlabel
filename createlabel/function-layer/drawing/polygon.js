// Polygon drawing functionality
import { DrawingState } from './models.js';

// Global drawing state
const drawingState = new DrawingState();
let mousePos = { x: 0, y: 0 };
let hoveredVertexIndex = -1;

// Status elements
let coordinatesElement;
let toolStatusElement;
let helpTextElement;

// Initialize polygon drawing
export function initPolygonDrawing(canvas, ctx) {
    // Get status elements
    coordinatesElement = document.getElementById('coordinates');
    toolStatusElement = document.getElementById('tool-status');
    helpTextElement = document.getElementById('help-text');
    
    // Mouse move handler for tracking position and hover effects
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Update coordinates display
        updateCoordinates(mousePos.x, mousePos.y);
        
        // Handle moving vertex
        if (drawingState.mode === 'move-vertex' && drawingState.dragStartPos) {
            drawingState.updateVertexPosition(mousePos.x, mousePos.y);
            redrawCanvas(ctx, canvas);
            return;
        }
        
        // Handle dragging polygon
        if (drawingState.mode === 'drag-polygon' && drawingState.dragStartPos) {
            drawingState.updateDraggedPolygon(mousePos.x, mousePos.y);
            redrawCanvas(ctx, canvas);
            return;
        }
        
        // Check for hover on first vertex when drawing
        if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
            hoveredVertexIndex = drawingState.currentPolygon.isNearFirstVertex(mousePos.x, mousePos.y) ? 0 : -1;
            
            // Update help text based on hover state
            if (hoveredVertexIndex === 0 && drawingState.currentPolygon.vertices.length >= 3) {
                helpTextElement.textContent = '点击首个顶点闭合多边形';
            } else {
                helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
            }
        }
        
        // Check for hover on vertices when selecting
        if (drawingState.mode === 'select' && drawingState.selectedPolygons.length === 1) {
            const polygon = drawingState.selectedPolygons[0];
            for (let i = 0; i < polygon.vertices.length; i++) {
                const v = polygon.vertices[i];
                if (Math.sqrt((mousePos.x - v.x) ** 2 + (mousePos.y - v.y) ** 2) <= 10) {
                    canvas.style.cursor = 'move';
                    hoveredVertexIndex = i;
                    return;
                }
            }
            
            // Check if hovering over polygon for dragging
            if (polygon.containsPoint(mousePos.x, mousePos.y)) {
                canvas.style.cursor = 'grab';
                hoveredVertexIndex = -1;
                return;
            }
            
            hoveredVertexIndex = -1;
            canvas.style.cursor = 'default';
        }
        
        // Redraw canvas to show hover effects
        redrawCanvas(ctx, canvas);
    });
    
    // Mouse up handler
    canvas.addEventListener('mouseup', (e) => {
        if (drawingState.mode === 'move-vertex') {
            drawingState.stopMovingVertex();
        } else if (drawingState.mode === 'drag-polygon') {
            drawingState.stopDraggingPolygon();
        }
    });
    
    return drawingState;
}

// Update coordinates display
function updateCoordinates(x, y) {
    if (coordinatesElement) {
        coordinatesElement.textContent = `坐标: ${Math.round(x)}, ${Math.round(y)}`;
    }
}

// Update tool status display
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
    
    // Update help text based on mode
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

// Enable polygon drawing mode
export function enablePolygonDrawing(canvas, ctx) {
    drawingState.mode = 'draw';
    canvas.style.cursor = 'crosshair';
    
    // Update status
    updateToolStatus('draw');
    
    // Remove any existing event listeners
    canvas.removeEventListener('mousedown', handleDrawingMouseDown);
    canvas.removeEventListener('contextmenu', handleDrawingRightClick);
    
    // Add event listeners for drawing
    canvas.addEventListener('mousedown', handleDrawingMouseDown);
    canvas.addEventListener('contextmenu', handleDrawingRightClick);
    
    // Start a new polygon if none exists
    if (!drawingState.currentPolygon) {
        drawingState.startNewPolygon();
    }
    
    // Initial draw
    redrawCanvas(ctx, canvas);
}

// Handle mouse down for drawing
function handleDrawingMouseDown(e) {
    if (e.button !== 0) return; // Only handle left clicks
    e.preventDefault();
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If hovering over first vertex and we have at least 3 points, close the polygon
    if (hoveredVertexIndex === 0 && drawingState.currentPolygon.vertices.length >= 3) {
        drawingState.finishCurrentPolygon();
        drawingState.startNewPolygon();
        helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
    } else {
        // Add a new vertex
        drawingState.currentPolygon.addVertex(x, y);
    }
    
    // Redraw canvas
    redrawCanvas(e.target.getContext('2d'), e.target);
}

// Handle right click for closing polygon
function handleDrawingRightClick(e) {
    e.preventDefault();
    
    if (drawingState.currentPolygon && drawingState.currentPolygon.vertices.length >= 3) {
        drawingState.finishCurrentPolygon();
        drawingState.startNewPolygon();
        
        // Update help text
        helpTextElement.textContent = '左键点击添加顶点，右键或闭合多边形完成绘制';
        
        // Redraw canvas
        redrawCanvas(e.target.getContext('2d'), e.target);
    }
}

// Draw a polygon on the canvas
export function drawPolygon(ctx, startPos) {
    if (drawingState.currentPolygon) {
        drawingState.currentPolygon.addVertex(startPos.x, startPos.y);
    } else {
        const polygon = drawingState.startNewPolygon();
        polygon.addVertex(startPos.x, startPos.y);
    }
    
    redrawCanvas(ctx, ctx.canvas);
}

// Redraw the entire canvas
export function redrawCanvas(ctx, canvas) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw imported image if exists
    if (drawingState.importedImage) {
        const img = drawingState.importedImage;
        const offset = drawingState.draggedImageOffset;
        
        // Calculate aspect ratio to fit image properly
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > canvasRatio) {
            // Image is wider than canvas (relative to height)
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetX = 0 + offset.x;
            offsetY = (canvas.height - drawHeight) / 2 + offset.y;
        } else {
            // Image is taller than canvas (relative to width)
            drawHeight = canvas.height;
            drawWidth = canvas.height * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2 + offset.x;
            offsetY = 0 + offset.y;
        }
        
        // Draw image with proper sizing
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    // Draw all completed polygons
    drawingState.polygons.forEach(polygon => {
        polygon.draw(ctx);
    });
    
    // Draw current polygon if in drawing mode
    if (drawingState.mode === 'draw' && drawingState.currentPolygon) {
        drawingState.currentPolygon.draw(ctx, true);
        
        // Draw preview line from last vertex to mouse position
        if (drawingState.currentPolygon.vertices.length > 0) {
            const lastVertex = drawingState.currentPolygon.vertices[drawingState.currentPolygon.vertices.length - 1];
            
            ctx.beginPath();
            ctx.moveTo(lastVertex.x, lastVertex.y);
            ctx.setLineDash([5, 5]);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = '#999999';
            ctx.stroke();
            ctx.setLineDash([]);
            
            // If hovering over first vertex, show connection preview
            if (hoveredVertexIndex === 0) {
                ctx.beginPath();
                ctx.arc(drawingState.currentPolygon.vertices[0].x, 
                        drawingState.currentPolygon.vertices[0].y, 
                        8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                ctx.fill();
            }
        }
    }
    
    // Draw selection rectangle if active
    if (drawingState.selectionRect) {
        ctx.beginPath();
        ctx.rect(
            drawingState.selectionRect.startX,
            drawingState.selectionRect.startY,
            drawingState.selectionRect.width,
            drawingState.selectionRect.height
        );
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}