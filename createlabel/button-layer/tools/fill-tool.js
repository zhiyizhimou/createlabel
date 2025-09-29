// Fill tool for filling areas
import { fill } from '../../function-layer/drawing/fill.js';

// Activate fill tool
export function activateFillTool() {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', (e) => {
        const pos = { x: e.clientX, y: e.clientY };
        fill(ctx, pos);
    });
}