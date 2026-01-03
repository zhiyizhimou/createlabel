// AI inference tool for segmentation
import { redrawCanvas } from '../../function-layer/drawing/polygon.js';

// 获取当前选择的病灶类型
function getSelectedLesionType() {
    const selectElement = document.getElementById('lesion-type-select');
    return selectElement ? selectElement.value : 'lung_nodule'; // 默认肺结节
}

// 调用后端分割接口
export async function runSegmentation() {
    // 1. 检查是否有选中标签
    if (!window.currentTag) {
        alert('请先选择一个标签再进行分割');
        return;
    }

    // 2. 获取画布元素和绘图状态
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const drawingState = canvas.drawingState;

    if (!drawingState) {
        alert('画布状态未初始化');
        return;
    }

    // 3. 检查是否有导入的图像
    if (!drawingState.importedImage) {
        alert('请先导入图像再进行分割');
        return;
    }

    try {
        // 4. 获取当前选择的病灶类型
        const lesionType = getSelectedLesionType();
        const lesionNames = {
            'lung_nodule': '肺结节',
            'skin_cancer': '皮肤癌',
            'breast_cancer': '乳腺癌'
        };

        // 更新帮助文本
        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = `正在处理${lesionNames[lesionType]}分割请求...`;
        }

        // 5. 将当前画布内容转换为Blob（用于后端推理）
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas转换失败')), 'image/png');
        });

        // 6. 调用后端分割接口，传递病灶类型
        const formData = new FormData();
        formData.append('image', blob, 'canvas-image.png');
        formData.append('lesion_type', lesionType);

        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `分割请求失败: ${response.status}`);
        }

        // 7. 处理后端返回的结果（包含mask和overlay）
        const result = await response.json();

        // 修改：统一优先显示黑白掩码图
        if (result.mask) {
            setSegmentationAsCanvasImage(result.mask, canvas, drawingState);
            if (helpTextElement) {
                helpTextElement.textContent = '分割完成，已显示黑白掩码图';
            }
        } else if (result.overlay) {
            // 如果没有掩码图，则显示边缘叠加图
            setSegmentationAsCanvasImage(result.overlay, canvas, drawingState);
            if (helpTextElement) {
                helpTextElement.textContent = '分割完成，已显示边缘叠加图（掩码图不可用）';
            }
        } else {
            alert('未获取到分割结果');
        }

    } catch (error) {
        console.error('分割失败:', error);
        alert(`分割过程出错: ${error.message}`);

        const helpTextElement = document.getElementById('help-text');
        if (helpTextElement) {
            helpTextElement.textContent = '分割失败，请检查网络连接和后端服务';
        }
    }
}

// 将分割结果设置为画布图像
function setSegmentationAsCanvasImage(imageBase64, canvas, drawingState) {
    const img = new Image();

    img.onload = () => {
        // 设置分割结果为新的画布图像
        drawingState.setImportedImage(img);
        drawingState.draggedImageOffset = { x: 0, y: 0 };

        // 重绘画布
        const ctx = canvas.getContext('2d');
        redrawCanvas(ctx, canvas);
    };

    img.onerror = (error) => {
        console.error('加载分割结果失败:', error);
        alert('无法加载分割结果图像');
    };

    img.src = `data:image/png;base64,${imageBase64}`;
}

// 初始化功能
export function initSegmentationPreview() {
    // 仅保留必要的初始化逻辑
}
