// 图片列表管理模块
class ImageListManager {
    constructor() {
        this.images = [];
        this.selectedImageId = null;
        this.init();
    }

    init() {
        // 初始化事件监听
        this.setupEventListeners();
        // 加载保存的图片列表
        this.loadSavedImages();
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 存入图片按钮
        document.getElementById('save-to-list-btn').addEventListener('click', () => {
            this.saveCanvasToImageList();
        });

        // 放入画布按钮
        document.getElementById('load-to-canvas-btn').addEventListener('click', () => {
            this.loadImageToCanvas();
        });
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    // 将画布内容保存到图片列表
    saveCanvasToImageList() {
        const canvas = document.getElementById('canvas');
        const drawingState = canvas.drawingState;

        // 检查是否有图像
        if (!drawingState.importedImage) {
            alert('请先导入图像到画布');
            return;
        }

        try {
            // 创建图片数据
            const imageData = canvas.toDataURL('image/png');
            const timestamp = new Date().toISOString();
            const imageName = `image_${this.images.length + 1}`;

            const imageItem = {
                id: timestamp,
                name: imageName,
                dataUrl: imageData,
                timestamp: timestamp,
                width: canvas.width,
                height: canvas.height
            };

            // 添加到列表
            this.images.push(imageItem);
            
            // 更新UI
            this.renderImageList();
            
            // 保存到本地存储
            this.saveToLocalStorage();

            // 更新状态
            this.updateButtonStates();

            console.log('图片已保存到列表:', imageName);
        } catch (error) {
            console.error('保存图片失败:', error);
            alert('保存图片失败，请重试');
        }
    }

    // 将选中的图片加载到画布
    loadImageToCanvas() {
        // 直接使用当前选中的图片ID，不进行额外检查
        if (this.selectedImageId === null) {
            return; // 不应该发生，因为按钮已禁用
        }

        const imageItem = this.images.find(img => img.id === this.selectedImageId);
        
        // 如果找不到图片，可能是数据不一致，尝试重新渲染列表
        if (!imageItem) {
            console.warn('图片数据不一致，重新渲染列表');
            this.renderImageList();
            return;
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const drawingState = canvas.drawingState;

        // 创建图片对象
        const img = new Image();
        img.onload = () => {
            // 清空画布
            drawingState.polygons = [];
            drawingState.currentPolygon = null;
            drawingState.clearSelection();
            drawingState.importedImage = img;
            drawingState.draggedImageOffset = { x: 0, y: 0 };

            // 重绘画布
            if (window.redrawCanvas) {
                window.redrawCanvas(ctx, canvas);
            }

            // 更新状态
            const helpTextElement = document.getElementById('help-text');
            if (helpTextElement) {
                helpTextElement.textContent = `已加载图片: ${imageItem.name}`;
            }

            console.log('图片已加载到画布:', imageItem.name);
        };

        img.onerror = () => {
            console.error('加载图片失败');
        };

        img.src = imageItem.dataUrl;
    }

    // 渲染图片列表
    renderImageList() {
        const container = document.getElementById('images-list');
        
        if (this.images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>暂无图片</p>
                    <p class="empty-hint">使用"存入图片"按钮将画布图片添加到列表</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.images.map(image => `
            <div class="image-item ${this.selectedImageId === image.id ? 'selected' : ''}" 
                 data-image-id="${image.id}">
                
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                </div>
                <div class="image-actions">
                    <button class="image-action-btn" onclick="imageListManager.deleteImage('${image.id}')" title="删除">×</button>
                </div>
            </div>
        `).join('');

        // 添加选择事件
        container.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('image-action-btn')) {
                    this.selectImage(item.dataset.imageId);
                }
            });
        });
    }

    // 选择图片
    selectImage(imageId) {
        // 确保图片ID在列表中存在
        const imageExists = this.images.some(img => img.id === imageId);
        if (!imageExists) {
            console.warn('尝试选择不存在的图片:', imageId);
            this.selectedImageId = null;
            this.renderImageList();
            this.updateButtonStates();
            return;
        }
        
        this.selectedImageId = imageId;
        this.renderImageList();
        this.updateButtonStates();
    }

    // 删除图片
    deleteImage(imageId) {
        if (confirm('确定要删除这张图片吗？')) {
            this.images = this.images.filter(img => img.id !== imageId);
            
            if (this.selectedImageId === imageId) {
                this.selectedImageId = null;
            }
            
            this.renderImageList();
            this.saveToLocalStorage();
            this.updateButtonStates();
        }
    }

    // 更新按钮状态
    updateButtonStates() {
        const saveBtn = document.getElementById('save-to-list-btn');
        const loadBtn = document.getElementById('load-to-canvas-btn');
        const canvas = document.getElementById('canvas');
        const drawingState = canvas.drawingState;

        // 存入图片按钮：只在有图像时可用
        saveBtn.disabled = !drawingState.importedImage;

        // 放入画布按钮：只在有选中图片时可用
        loadBtn.disabled = !this.selectedImageId;
    }

    // 保存到本地存储
    saveToLocalStorage() {
        try {
            localStorage.setItem('imageList', JSON.stringify(this.images));
        } catch (error) {
            console.warn('无法保存到本地存储:', error);
        }
    }

    // 从本地存储加载
    loadSavedImages() {
        try {
            const saved = localStorage.getItem('imageList');
            if (saved) {
                this.images = JSON.parse(saved);
                this.renderImageList();
                this.updateButtonStates();
            }
        } catch (error) {
            console.warn('无法从本地存储加载图片列表:', error);
        }
    }
}

// 创建全局实例
window.imageListManager = new ImageListManager();

// 导出供其他模块使用
export default ImageListManager;
