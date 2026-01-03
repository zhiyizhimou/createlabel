// Main application entry point
import { initToolbar } from './button-layer/toolbar.js';
import { initLogin } from './button-layer/login.js'; // 导入登录模块

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initializing...');
    
    // 初始化登录功能
    initLogin();
    
    // 初始化工具栏
    initToolbar();
    
    console.log('Application initialized successfully');
});
