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
 * @param {Function} onSuccess - 成功回调
 */
export function setupImportButton(canvas, onSuccess) {
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
    
    // 创建文件输入元素
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('click', function(e) {
            e.stopPropagation();
        }, true);
        
        // 文件选择变更事件处理
        fileInput.addEventListener('change', createFileChangeHandler(canvas, onSuccess));
    }
    
    // 定义点击事件处理函数
    clickHandler = function() {
        fileInput.value = '';
        fileInput.click();
    };
    
    // 移除可能存在的旧监听器，然后绑定新监听器
    importBtn.removeEventListener('click', clickHandler);
    importBtn.addEventListener('click', clickHandler);
    
    isInitialized = true;
}

/**
 * 创建文件change事件处理函数
 */
function createFileChangeHandler(canvas, onSuccess) {
    let isProcessing = false;
    
    return async function(e) {
        const file = e.target.files[0];
        
        if (!file || isProcessing) {
            return;
        }
        
        isProcessing = true;
        
        try {
            // 更新帮助文本
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = '正在导入图像...';
            }
            
            // 读取图像数据
            const imgData = await importImage(file);
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
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
            
            // 设置光标为默认样式
            canvas.style.cursor = 'default';
            
            // 重绘画布
            redrawCanvas(ctx, canvas);
            
            // 调用成功回调
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            
            // 更新帮助文本
            if (helpTextElement) {
                helpTextElement.textContent = `图像 "${file.name}" 已导入`;
            }
            
        } catch (error) {
            console.error('导入错误:', error);
            
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = '图像加载失败，请尝试其他图像';
            }
            
            alert('导入图像失败，请检查文件格式。');
        } finally {
            isProcessing = false;
        }
    };
}

/**
 * 清理函数
 */
export function cleanupImportButton() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn && clickHandler) {
        importBtn.removeEventListener('click', clickHandler);
    }
    isInitialized = false;
}