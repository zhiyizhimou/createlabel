// Zoom logic for the application
import { scale } from '../function-layer/math/scaling.js';

// Example zoom logic
export function applyZoom(ctx, factor) {
    scale(ctx, factor);
}