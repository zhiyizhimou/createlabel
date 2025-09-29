// Zoom controls for UI
import { scale } from '../../function-layer/math/scaling.js';

// Example zoom controls
export function setupZoomControls(canvas, factor) {
    const ctx = canvas.getContext('2d');
    scale(ctx, factor);
}