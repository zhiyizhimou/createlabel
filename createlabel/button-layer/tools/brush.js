// Brush tool for drawing
import { drawPolygon } from '../../function-layer/drawing/polygon.js';

// Activate brush tool
export function activateBrush() {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', (e) => {
        const pos = { x: e.clientX, y: e.clientY };
        drawPolygon(ctx, pos);
    });
}