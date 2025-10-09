// Eraser tool for clearing drawings
import { clearSelection } from '../../function-layer/drawing/select.js';

// Activate eraser tool
export function activateEraser() {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', (e) => {
        const pos = { x: e.clientX, y: e.clientY };
        clearSelection(ctx, pos);
    });
}