// 文件导入功能模块
import { redrawCanvas } from '../../function-layer/drawing/polygon.js';

// 全局变量（单例模式）
let fileInput = null;
let isInitialized = false; // 初始化标志位
let clickHandler = null; // 点击事件处理函数引用

/**
 * 从图像中提取主色调
 * @param {Image} img - 图像对象
 * @returns {string} 十六进制颜色代码
 */
function extractDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸与图像一致
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 绘制图像到canvas
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    try {
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        // 简化采样：每100个像素采样一次
        const colorCount = {};
        let maxCount = 0;
        let dominantColor = '#4a90e2'; // 默认颜色
        
        for (let i = 0; i < data.length; i += 400) { // 4 channels per pixel
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 跳过透明或接近透明的像素
            if (data[i + 3] < 128) continue;
            
            // 转换为十六进制
            const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            
            // 计数颜色出现次数
            colorCount[hexColor] = (colorCount[hexColor] || 0) + 1;
            
            // 更新主色调
            if (colorCount[hexColor] > maxCount) {
                maxCount = colorCount[hexColor];
                dominantColor = hexColor;
            }
        }
        
        return dominantColor;
    } catch (error) {
        console.warn('颜色提取失败，使用默认颜色:', error);
        return '#4a90e2'; // 默认蓝色
    }
}

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
 * @param {Function} onSuccess - 成功回调，现在接收颜色参数
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
        let extractedColor = '#4a90e2'; // 默认颜色
        
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
            
            // 提取主色调
            extractedColor = extractDominantColor(img);
            
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
            
            // 调用成功回调，传递提取的颜色
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(extractedColor);
            }
            
            // 更新帮助文本
            if (helpTextElement) {
                helpTextElement.textContent = `图像 "${file.name}" 已导入，主色调: ${extractedColor}`;
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