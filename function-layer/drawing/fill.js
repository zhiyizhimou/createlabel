// Fill functionality
import { redrawCanvas } from './polygon.js';

// Enable fill mode
export function enableFill(drawingState, canvas, ctx) {
    drawingState.mode = 'fill';
    canvas.style.cursor = 'cell';
    
    // Update status bar
    const toolStatusElement = document.getElementById('tool-status');
    const helpTextElement = document.getElementById('help-text');
    
    if (toolStatusElement) {
        toolStatusElement.textContent = '当前工具: 填充';
    }
    
    if (helpTextElement) {
        helpTextElement.textContent = '点击多边形进行填充，使用颜色选择器更改颜色和透明度';
    }
    
    // Remove any existing event listeners
    canvas.removeEventListener('click', handleFillClick);
    
    // Add event listener for fill
    canvas.addEventListener('click', handleFillClick);
    
    // Clear any current polygon drawing
    drawingState.cancelCurrentPolygon();
    
    // Initial draw
    redrawCanvas(ctx, canvas);
}

// Handle click for fill
function handleFillClick(e) {
    if (e.button !== 0) return; // Only handle left clicks
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const drawingState = e.target.drawingState;
    
    // Check if clicked on a polygon
    const clickedPolygon = drawingState.getPolygonAt(x, y);
    if (clickedPolygon) {
        // Select the polygon
        drawingState.clearSelection();
        clickedPolygon.isSelected = true;
        drawingState.selectedPolygons.push(clickedPolygon);
        
        // Apply fill with current color and opacity
        fill(drawingState, e.target.getContext('2d'), e.target);
        
        // Update help text
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = `已填充多边形，颜色: ${drawingState.currentColor}，透明度: ${Math.round(drawingState.currentOpacity * 100)}%`;
        }
    }
}

// Fill selected polygons
export function fill(drawingState, ctx, canvas) {
    if (drawingState.selectedPolygons.length === 0) return;
    
    // Apply current color and opacity to selected polygons
    drawingState.fillSelectedPolygons(drawingState.currentColor, drawingState.currentOpacity);
    
    // Redraw canvas
    redrawCanvas(ctx, canvas);
}