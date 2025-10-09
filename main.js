// Main application entry point
import { initToolbar } from './button-layer/toolbar.js';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initializing...');
    initToolbar();
    console.log('Application initialized successfully');
});