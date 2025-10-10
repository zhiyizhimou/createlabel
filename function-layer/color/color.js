// Color utilities
import { redrawCanvas } from '../drawing/polygon.js';

// Initialize color picker
export function initColorPicker(drawingState, canvas, ctx) {
    const colorInput = document.getElementById('color-input');
    const opacityInput = document.getElementById('opacity-input');
    const opacityValue = document.getElementById('opacity-value');

    // Provide sensible defaults if controls are missing
    const defaultColor = '#4a90e2';
    const defaultOpacity = 1;

    // Set initial values safely
    drawingState.currentColor = (colorInput && colorInput.value) ? colorInput.value : defaultColor;
    drawingState.currentOpacity = (opacityInput && !isNaN(parseFloat(opacityInput.value))) ? parseFloat(opacityInput.value) : defaultOpacity;
    if (opacityValue) {
        updateOpacityDisplay(drawingState.currentOpacity);
    }

    // Add event listeners only when elements exist
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            drawingState.currentColor = e.target.value;
            updateSelectedPolygons(drawingState, ctx, canvas);
        });
    }

    if (opacityInput) {
        opacityInput.addEventListener('input', (e) => {
            drawingState.currentOpacity = parseFloat(e.target.value);
            if (opacityValue) updateOpacityDisplay(drawingState.currentOpacity);
            updateSelectedPolygons(drawingState, ctx, canvas);
        });
    }
    
    // Function to update opacity display
    function updateOpacityDisplay(opacity) {
        opacityValue.textContent = `${Math.round(opacity * 100)}%`;
    }
}

// Update selected polygons with current color settings
function updateSelectedPolygons(drawingState, ctx, canvas) {
    if (drawingState.mode === 'fill' && drawingState.selectedPolygons.length > 0) {
        drawingState.fillSelectedPolygons(drawingState.currentColor, drawingState.currentOpacity);
        redrawCanvas(ctx, canvas);
    }
}

// Get a random color
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Set opacity for a color
export function setOpacity(color, opacity) {
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}