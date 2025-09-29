// Data models for drawing application
export class DrawingState {
    constructor() {
        this.mode = 'none'; // 'none', 'draw', 'select', 'fill', 'move-vertex', 'drag-polygon'
        this.polygons = [];
        this.currentPolygon = null;
        this.selectedPolygons = [];
        this.selectionRect = null;
        this.currentColor = '#000000';
        this.currentOpacity = 1;
        this.importedImage = null;
        this.dragStartPos = null;
        this.draggedImageOffset = { x: 0, y: 0 };
        this.activeVertexIndex = -1;
    }

    // Start a new polygon
    startNewPolygon() {
        this.currentPolygon = new Polygon();
        return this.currentPolygon;
    }

    // Finish current polygon
    finishCurrentPolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length >= 3) {
            this.polygons.push(this.currentPolygon);
            this.currentPolygon = null;
        }
    }

    // Cancel current polygon
    cancelCurrentPolygon() {
        this.currentPolygon = null;
    }

    // Clear selection
    clearSelection() {
        this.selectedPolygons.forEach(p => p.isSelected = false);
        this.selectedPolygons = [];
    }

    // Get polygon at position
    getPolygonAt(x, y) {
        return this.polygons.find(p => p.containsPoint(x, y));
    }

    // Fill selected polygons
    fillSelectedPolygons(color, opacity) {
        this.selectedPolygons.forEach(p => {
            p.fillColor = color;
            p.fillOpacity = opacity;
        });
    }

    // Set imported image
    setImportedImage(img) {
        this.importedImage = img;
    }

    // Start dragging polygon
    startDraggingPolygon(x, y) {
        if (this.selectedPolygons.length === 1) {
            this.dragStartPos = { x, y };
            this.mode = 'drag-polygon';
            this.selectedPolygons[0].dragOffset = { x: 0, y: 0 };
        }
    }

    // Update dragged polygon position
    updateDraggedPolygon(x, y) {
        if (this.dragStartPos && this.selectedPolygons.length === 1) {
            const polygon = this.selectedPolygons[0];
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            
            // Update all vertices
            polygon.vertices.forEach(vertex => {
                vertex.x += dx;
                vertex.y += dy;
            });
            
            // Update drag offset
            polygon.dragOffset.x += dx;
            polygon.dragOffset.y += dy;
            
            this.dragStartPos = { x, y };
        }
    }

    // Stop dragging polygon
    stopDraggingPolygon() {
        this.dragStartPos = null;
        this.mode = 'select';
    }

    // Start moving vertex
    startMovingVertex(polygon, vertexIndex, x, y) {
        this.activeVertexIndex = vertexIndex;
        this.dragStartPos = { x, y };
        this.mode = 'move-vertex';
    }

    // Update vertex position
    updateVertexPosition(x, y) {
        if (this.dragStartPos && this.activeVertexIndex >= 0 && this.selectedPolygons.length > 0) {
            const polygon = this.selectedPolygons[0];
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            
            polygon.vertices[this.activeVertexIndex].x += dx;
            polygon.vertices[this.activeVertexIndex].y += dy;
            
            this.dragStartPos = { x, y };
        }
    }

    // Stop moving vertex
    stopMovingVertex() {
        this.activeVertexIndex = -1;
        this.dragStartPos = null;
        this.mode = 'select';
    }
}

export class Polygon {
    constructor() {
        this.vertices = [];
        this.isSelected = false;
        this.fillColor = null;
        this.fillOpacity = 1;
        this.dragOffset = { x: 0, y: 0 };
    }

    // Add vertex
    addVertex(x, y) {
        this.vertices.push({ x, y });
    }

    // Check if point is inside polygon
    containsPoint(x, y) {
        if (this.vertices.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x, yi = this.vertices[i].y;
            const xj = this.vertices[j].x, yj = this.vertices[j].y;
            
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Check if near first vertex
    isNearFirstVertex(x, y, radius = 10) {
        if (this.vertices.length === 0) return false;
        const first = this.vertices[0];
        return Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2) <= radius;
    }

    // Draw polygon
    draw(ctx, isCurrent = false) {
        if (this.vertices.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        
        // Close path if polygon is complete
        if (!isCurrent && this.vertices.length >= 3) {
            ctx.closePath();
        }
        
        // Stroke style
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.isSelected ? '#FF0000' : '#000000';
        ctx.stroke();
        
        // Fill if specified
        if (this.fillColor && this.vertices.length >= 3) {
            ctx.fillStyle = this.fillColor;
            ctx.globalAlpha = this.fillOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw vertices if selected
        if (this.isSelected) {
            ctx.fillStyle = '#FF0000';
            this.vertices.forEach(v => {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
}