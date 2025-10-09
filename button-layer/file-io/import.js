// 文件导入功能模块
import { redrawCanvas } from '../../function-layer/drawing/polygon.js';

// 全局变量（单例模式）
let fileInput = null;
let isInitialized = false; // 初始化标志位
let clickHandler = null; // 点击事件处理函数引用

/**
 * 导入图像函数
 * @param {File} file - 用户选择的图像文件
 * @returns {Promise} 返回包含图像数据URL的Promise
 * @description 将用户选择的图像文件转换为数据URL
 */
export function importImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsDataURL(file);
    });
}

/**
 * 设置导入按钮功能
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @description 初始化导入按钮功能，包括文件选择、图像加载和错误处理
 */
export function setupImportButton(canvas) {
    const importBtn = document.getElementById('import-btn');
    
    if (!importBtn) {
        console.error('Import button not found');
        return;
    }
    
    // 防止重复初始化
    if (isInitialized) {
        console.warn('Import button already initialized');
        return;
    }
    
    // 创建文件输入元素（仅一次）
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // 防止事件冒泡 - 使用捕获阶段[1](@ref)
        fileInput.addEventListener('click', function(e) {
            e.stopPropagation();
        }, true);
        
        // 文件选择变更事件处理（只绑定一次）
        fileInput.addEventListener('change', createFileChangeHandler(canvas));
    }
    
    // 定义点击事件处理函数
    clickHandler = function() {
        // 重置文件输入，允许重复选择同一文件
        fileInput.value = '';
        // 触发文件选择对话框
        fileInput.click();
    };
    
    // 移除可能存在的旧监听器，然后绑定新监听器[6](@ref)
    importBtn.removeEventListener('click', clickHandler);
    importBtn.addEventListener('click', clickHandler);
    
    isInitialized = true; // 标记已初始化
}

/**
 * 创建文件change事件处理函数（工厂模式）
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @returns {Function} 事件处理函数
 */
function createFileChangeHandler(canvas) {
    let isProcessing = false; // 处理状态标志，防止重复处理[3](@ref)
    
    return async function(e) {
        const file = e.target.files[0];
        
        // 如果没有文件或正在处理中，直接返回
        if (!file || isProcessing) {
            return;
        }
        
        isProcessing = true; // 标记为处理中
        
        try {
            // 更新帮助文本，提示用户正在处理
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = '正在导入图像...';
            }
            
            // 读取图像数据
            const imgData = await importImage(file);
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // 使用Promise包装图像加载
            const imgLoadPromise = new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = (error) => reject(error);
            });
            
            img.src = imgData;
            
            // 等待图像加载完成
            await imgLoadPromise;
            
            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 设置导入的图像到绘图状态
            canvas.drawingState.setImportedImage(img);
            canvas.drawingState.draggedImageOffset = { x: 0, y: 0 };
            
            // 启用所有绘图工具按钮
            const buttons = ['draw-btn', 'select-btn', 'fill-btn', 'clear-btn'];
            buttons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });
            
            // 设置光标为默认样式
            canvas.style.cursor = 'default';
            
            // 重绘画布
            redrawCanvas(ctx, canvas);
            
            // 更新帮助文本，显示导入成功信息
            if (helpTextElement) {
                helpTextElement.textContent = `图像 "${file.name}" 已导入，尺寸: ${img.width}x${img.height}`;
            }
            
        } catch (error) {
            console.error('导入错误:', error);
            
            // 错误处理
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = '图像加载失败，请尝试其他图像';
            }
            
            alert('导入图像失败，请检查文件格式。');
        } finally {
            isProcessing = false; // 重置处理状态
        }
    };
}

/**
 * 清理函数（用于组件卸载时调用）
 * @description 移除事件监听器，避免内存泄漏
 */
export function cleanupImportButton() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn && clickHandler) {
        importBtn.removeEventListener('click', clickHandler);
    }
    isInitialized = false;
}