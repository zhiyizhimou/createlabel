// Brush tool for drawing
import { drawPolygon } from '../../function-layer/drawing/polygon.js';

// Activate brush tool
export function activateBrush() {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', (e) => {
        // Check if a tag is selected
        if (!window.currentTag) {
            alert('请先选择一个标签');
            return;
        }
        
        const pos = { x: e.clientX, y: e.clientY };
        drawPolygon(ctx, pos);
    });
}