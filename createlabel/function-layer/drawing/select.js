// Selection functionality
import { redrawCanvas } from './polygon.js';

// Global variables for vertex dragging
let hoveredVertexIndex = -1;
let hoveredPolygon = null;
let isDraggingVertex = false;
let dragStartPos = null;
let originalVertexPos = null;

// Enable selection mode
export function enableSelection(drawingState, canvas, ctx) {
    drawingState.mode = 'select';
    canvas.style.cursor = 'default';
    
    // Update status bar
    const toolStatusElement = document.getElementById('tool-status');
    const helpTextElement = document.getElementById('help-text');
    
    if (toolStatusElement) {
        toolStatusElement.textContent = '当前工具: 选择';
    }
    
    if (helpTextElement) {
        helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
    }
    
    // Remove any existing event listeners
    canvas.removeEventListener('mousedown', handleSelectionMouseDown);
    canvas.removeEventListener('mousemove', handleSelectionMouseMove);
    canvas.removeEventListener('mouseup', handleSelectionMouseUp);
    
    // Add event listeners for selection
    canvas.addEventListener('mousedown', handleSelectionMouseDown);
    canvas.addEventListener('mousemove', handleSelectionMouseMove);
    canvas.addEventListener('mouseup', handleSelectionMouseUp);
    
    // Clear any current polygon drawing
    if (drawingState.cancelCurrentPolygon) {
        drawingState.cancelCurrentPolygon();
    }
    
    // Initial draw
    redrawCanvas(ctx, canvas);
}

// Check if mouse is near a vertex
function getVertexAtPoint(polygon, x, y, threshold = 8) {
    for (let i = 0; i < polygon.vertices.length; i++) {
        const vertex = polygon.vertices[i];
        const distance = Math.sqrt((vertex.x - x) ** 2 + (vertex.y - y) ** 2);
        if (distance <= threshold) {
            return i; // Return vertex index
        }
    }
    return -1; // No vertex found
}

// Handle mouse down for selection
function handleSelectionMouseDown(e) {
    if (e.button !== 0) return; // Only handle left clicks
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const drawingState = e.target.drawingState;
    
    // Reset hover state
    hoveredVertexIndex = -1;
    hoveredPolygon = null;
    
    // Check if clicked on a polygon vertex
    if (drawingState.selectedPolygons && drawingState.selectedPolygons.length > 0) {
        for (const polygon of drawingState.selectedPolygons) {
            const vertexIndex = getVertexAtPoint(polygon, x, y);
            if (vertexIndex >= 0) {
                // Start dragging vertex
                isDraggingVertex = true;
                hoveredPolygon = polygon;
                hoveredVertexIndex = vertexIndex;
                dragStartPos = { x, y };
                originalVertexPos = { 
                    x: polygon.vertices[vertexIndex].x, 
                    y: polygon.vertices[vertexIndex].y 
                };
                
                // Update cursor
                e.target.style.cursor = 'grabbing';
                
                // Update help text
                const helpTextElement = document.getElementById('help-text');
                if (helpTextElement) {
                    helpTextElement.textContent = '拖动顶点调整形状，释放鼠标完成编辑';
                }
                
                e.preventDefault();
                return;
            }
        }
    }
    
    // Check if clicked on selected polygon (for dragging entire polygon)
    if (drawingState.selectedPolygons && drawingState.selectedPolygons.length === 1) {
        const polygon = drawingState.selectedPolygons[0];
        if (isPointInPolygon(x, y, polygon.vertices)) {
            // Start dragging entire polygon
            drawingState.startDraggingPolygon(x, y);
            e.target.style.cursor = 'grabbing';
            
            // Update help text
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = '拖动多边形移动位置，释放鼠标完成移动';
            }
            
            e.preventDefault();
            return;
        }
    }
    
    // Start selection rectangle
    drawingState.selectionRect = {
        startX: x,
        startY: y,
        width: 0,
        height: 0,
        isActive: true
    };
    
    // Check if clicked on a polygon
    const clickedPolygon = drawingState.getPolygonAt ? drawingState.getPolygonAt(x, y) : null;
    if (clickedPolygon) {
        // If holding shift, add to selection
        if (e.shiftKey) {
            clickedPolygon.isSelected = !clickedPolygon.isSelected;
            if (clickedPolygon.isSelected) {
                if (!drawingState.selectedPolygons) drawingState.selectedPolygons = [];
                if (!drawingState.selectedPolygons.includes(clickedPolygon)) {
                    drawingState.selectedPolygons.push(clickedPolygon);
                }
            } else {
                if (drawingState.selectedPolygons) {
                    const index = drawingState.selectedPolygons.indexOf(clickedPolygon);
                    if (index !== -1) {
                        drawingState.selectedPolygons.splice(index, 1);
                    }
                }
            }
        } else {
            // Clear previous selection and select this polygon
            if (drawingState.clearSelection) drawingState.clearSelection();
            clickedPolygon.isSelected = true;
            if (!drawingState.selectedPolygons) drawingState.selectedPolygons = [];
            drawingState.selectedPolygons = [clickedPolygon];
        }
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = `已选择 ${drawingState.selectedPolygons ? drawingState.selectedPolygons.length : 0} 个多边形`;
        }
        
        // Redraw canvas
        redrawCanvas(e.target.getContext('2d'), e.target);
    } else if (!e.shiftKey) {
        // If not holding shift and clicked on empty space, clear selection
        if (drawingState.clearSelection) drawingState.clearSelection();
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
        }
        
        redrawCanvas(e.target.getContext('2d'), e.target);
    }
}

// Handle mouse move for selection
function handleSelectionMouseMove(e) {
    const drawingState = e.target.drawingState;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle vertex dragging
    if (isDraggingVertex && hoveredPolygon && hoveredVertexIndex >= 0) {
        // Update vertex position
        hoveredPolygon.vertices[hoveredVertexIndex].x = x;
        hoveredPolygon.vertices[hoveredVertexIndex].y = y;
        
        // Redraw canvas
        redrawCanvas(e.target.getContext('2d'), e.target);
        return;
    }
    
    // Handle dragging entire polygon
    if (drawingState.mode === 'drag-polygon' && drawingState.dragStartPos) {
        if (drawingState.updateDraggedPolygon) {
            drawingState.updateDraggedPolygon(x, y);
        }
        redrawCanvas(e.target.getContext('2d'), e.target);
        return;
    }
    
    // Update hover state for vertices
    if (drawingState.selectedPolygons && drawingState.selectedPolygons.length > 0 && !isDraggingVertex) {
        let vertexHovered = false;
        
        for (const polygon of drawingState.selectedPolygons) {
            const vertexIndex = getVertexAtPoint(polygon, x, y);
            if (vertexIndex >= 0) {
                hoveredVertexIndex = vertexIndex;
                hoveredPolygon = polygon;
                e.target.style.cursor = 'grab';
                vertexHovered = true;
                break;
            }
        }
        
        if (!vertexHovered) {
            hoveredVertexIndex = -1;
            hoveredPolygon = null;
            
            // Check if hovering over a selected polygon
            let polygonHovered = false;
            if (drawingState.selectedPolygons.length === 1) {
                const polygon = drawingState.selectedPolygons[0];
                if (isPointInPolygon(x, y, polygon.vertices)) {
                    e.target.style.cursor = 'move';
                    polygonHovered = true;
                }
            }
            
            if (!polygonHovered) {
                e.target.style.cursor = 'default';
            }
        }
    }
    
    // Handle selection rectangle
    if (drawingState.selectionRect && drawingState.selectionRect.isActive) {
        // Update selection rectangle
        drawingState.selectionRect.width = x - drawingState.selectionRect.startX;
        drawingState.selectionRect.height = y - drawingState.selectionRect.startY;
        
        // Redraw canvas
        redrawCanvas(e.target.getContext('2d'), e.target);
    }
}

// Handle mouse up for selection
function handleSelectionMouseUp(e) {
    const drawingState = e.target.drawingState;
    
    // Stop vertex dragging
    if (isDraggingVertex) {
        isDraggingVertex = false;
        dragStartPos = null;
        originalVertexPos = null;
        e.target.style.cursor = 'default';
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '顶点位置已更新';
        }
        return;
    }
    
    // Stop dragging entire polygon
    if (drawingState.mode === 'drag-polygon') {
        if (drawingState.stopDraggingPolygon) {
            drawingState.stopDraggingPolygon();
        }
        e.target.style.cursor = 'default';
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '多边形位置已更新';
        }
        return;
    }
    
    if (!drawingState.selectionRect) return;
    
    // If selection rectangle is active and has size
    if (drawingState.selectionRect.isActive && 
        (Math.abs(drawingState.selectionRect.width) > 5 || 
         Math.abs(drawingState.selectionRect.height) > 5)) {
        
        // Normalize rectangle coordinates
        const selRect = {
            left: Math.min(drawingState.selectionRect.startX, drawingState.selectionRect.startX + drawingState.selectionRect.width),
            top: Math.min(drawingState.selectionRect.startY, drawingState.selectionRect.startY + drawingState.selectionRect.height),
            right: Math.max(drawingState.selectionRect.startX, drawingState.selectionRect.startX + drawingState.selectionRect.width),
            bottom: Math.max(drawingState.selectionRect.startY, drawingState.selectionRect.startY + drawingState.selectionRect.height)
        };
        
        // If not holding shift, clear previous selection
        if (!e.shiftKey && drawingState.clearSelection) {
            drawingState.clearSelection();
        }
        
        // Select all polygons that intersect with the selection rectangle
        if (drawingState.polygons) {
            drawingState.polygons.forEach(polygon => {
                // Check if any vertex is inside the selection rectangle
                const isInside = polygon.vertices.some(vertex => 
                    vertex.x >= selRect.left && 
                    vertex.x <= selRect.right && 
                    vertex.y >= selRect.top && 
                    vertex.y <= selRect.bottom
                );
                
                if (isInside) {
                    polygon.isSelected = true;
                    if (!drawingState.selectedPolygons) drawingState.selectedPolygons = [];
                    if (!drawingState.selectedPolygons.includes(polygon)) {
                        drawingState.selectedPolygons.push(polygon);
                    }
                }
            });
        }
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            if (drawingState.selectedPolygons && drawingState.selectedPolygons.length > 0) {
                helpTextElement.textContent = `已选择 ${drawingState.selectedPolygons.length} 个多边形`;
            } else {
                helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
            }
        }
    }
    
    // Clear selection rectangle
    drawingState.selectionRect = null;
    
    // Redraw canvas
    redrawCanvas(e.target.getContext('2d'), e.target);
}

// Utility function to check if point is inside polygon
function isPointInPolygon(x, y, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Clear selection
export function clearSelection(ctx, canvas) {
    const drawingState = canvas.drawingState;
    if (drawingState.clearSelection) {
        drawingState.clearSelection();
    }
    
    // Reset vertex dragging state
    isDraggingVertex = false;
    hoveredVertexIndex = -1;
    hoveredPolygon = null;
    dragStartPos = null;
    originalVertexPos = null;
    
    // Update help text
    const helpTextElement = document.getElementById('help-text');
    if (helpTextElement) {
        helpTextElement.textContent = '点击选择多边形，拖动顶点编辑形状，拖动多边形移动位置';
    }
    
    redrawCanvas(ctx, canvas);
}

// Draw selection highlights (to be called from redrawCanvas)
export function drawSelectionHighlights(ctx, drawingState) {
    if (!drawingState.selectedPolygons || drawingState.selectedPolygons.length === 0) return;
    
    // Draw selection rectangles and vertex handles for selected polygons
    drawingState.selectedPolygons.forEach(polygon => {
        if (!polygon.vertices || polygon.vertices.length === 0) return;
        
        // Calculate bounding box
        const xs = polygon.vertices.map(v => v.x);
        const ys = polygon.vertices.map(v => v.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Draw selection rectangle
        ctx.strokeStyle = '#4361ee';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
        ctx.setLineDash([]);
        
        // Draw vertex handles
        ctx.fillStyle = '#4361ee';
        polygon.vertices.forEach(vertex => {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    
    // Draw selection rectangle if active
    if (drawingState.selectionRect && drawingState.selectionRect.isActive) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(
            drawingState.selectionRect.startX,
            drawingState.selectionRect.startY,
            drawingState.selectionRect.width,
            drawingState.selectionRect.height
        );
        ctx.setLineDash([]);
    }
}