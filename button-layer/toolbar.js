// Toolbar controller for UI interactions
import { initDrawingLogic, enableDrawing, enableSelectionMode, clearCanvas, resizeCanvas } from '../app-layer/drawing-logic.js';
import { redrawCanvas } from '../function-layer/drawing/polygon.js';
import { setupImportButton } from './file-io/import.js';
import { exportImage } from './file-io/export.js';
import { initSegmentationPreview } from './features/ai-inference.js';
import ImageListManager from './features/image-list-manager.js';

// 将模态框相关变量提升到模块作用域
let currentEditingTag = null;
let isEditingMode = false;

// 显示模态框函数（提升到模块作用域）
function showModal(tag = null) {
    const modal = document.getElementById('tag-modal');
    const modalTitle = document.querySelector('.modal-header h3');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagNameInput = document.getElementById('tag-name-input');
    const tagColorInput = document.getElementById('tag-color-input');
    const tagOpacityInput = document.getElementById('tag-opacity-input');
    const tagOpacityValue = document.getElementById('tag-opacity-value');
    
    if (!modal) return;
    
    modal.style.display = 'block';
    
    if (tag) {
        // 编辑模式
        isEditingMode = true;
        currentEditingTag = tag;
        modalTitle.textContent = '编辑标签';
        addTagBtn.textContent = '更新标签';
        
        // 填充现有数据
        tagNameInput.value = tag.name;
        tagColorInput.value = tag.color;
        tagOpacityInput.value = String(tag.opacity);
        tagOpacityValue.textContent = `${Math.round(tag.opacity * 100)}%`;
    } else {
        // 添加模式
        isEditingMode = false;
        currentEditingTag = null;
        modalTitle.textContent = '添加新标签';
        addTagBtn.textContent = '添加标签';
        
        // 清空输入
        tagNameInput.value = '';
        tagColorInput.value = '#4a90e2';
        tagOpacityInput.value = '1';
        tagOpacityValue.textContent = '100%';
    }
    
    tagNameInput.focus();
}

// 隐藏模态框函数（提升到模块作用域）
function hideModal() {
    const modal = document.getElementById('tag-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    isEditingMode = false;
    currentEditingTag = null;
}

// 标签管理功能
function initTagManagement() {
    const showModalBtn = document.getElementById('show-add-tag-modal');
    const modal = document.getElementById('tag-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-add-tag');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagNameInput = document.getElementById('tag-name-input');
    const tagColorInput = document.getElementById('tag-color-input');
    const tagOpacityInput = document.getElementById('tag-opacity-input');
    const tagOpacityValue = document.getElementById('tag-opacity-value');
    const tagsList = document.getElementById('tags-list');

    // Store tags and current selected tag
    window.tags = [];
    window.currentTag = null;
    
    // 模态框事件监听
    if (showModalBtn) {
        showModalBtn.addEventListener('click', () => showModal());
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }

    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });
    }

    // 透明度滑块事件
    if (tagOpacityInput && tagOpacityValue) {
        tagOpacityInput.addEventListener('input', () => {
            const v = parseFloat(tagOpacityInput.value);
            tagOpacityValue.textContent = `${Math.round(v * 100)}%`;
        });
    }

    // 添加/更新标签按钮事件
    if (addTagBtn && tagNameInput && tagColorInput && tagsList) {
        addTagBtn.addEventListener('click', () => {
            const name = tagNameInput.value.trim();
            const color = tagColorInput.value;
            const opacity = parseFloat(tagOpacityInput.value) || 1;

            if (!name) {
                alert('请输入标签名称');
                return;
            }

            if (isEditingMode && currentEditingTag) {
                // 编辑模式：更新现有标签
                // 检查名称是否重复（排除自身）
                if (window.tags.some(tag => tag.name === name && tag !== currentEditingTag)) {
                    alert('标签名称已存在');
                    return;
                }

                // 保存旧名称用于更新多边形引用
                const oldName = currentEditingTag.name;
                
                // 更新标签属性
                currentEditingTag.name = name;
                currentEditingTag.color = color;
                currentEditingTag.opacity = opacity;

                // 更新UI中的标签元素
                updateTagElement(currentEditingTag, oldName);

                // 如果当前正在使用的标签被编辑，更新绘图状态
                if (window.currentTag && window.currentTag.name === oldName) {
                    window.currentTag = currentEditingTag;
                    if (window.appCanvas && window.appCanvas.drawingState) {
                        window.appCanvas.drawingState.currentColor = color;
                        window.appCanvas.drawingState.currentOpacity = opacity;
                    }
                }

                // 更新所有使用该标签的多边形
                if (window.appCanvas && window.appCanvas.drawingState) {
                    const ds = window.appCanvas.drawingState;
                    ds.polygons.forEach(p => {
                        if (p.tagName === oldName) {
                            p.tagName = name;
                            p.fillColor = color;
                            p.fillOpacity = opacity;
                        }
                    });
                    
                    // 重绘画布
                    const ctx = window.appCanvas.getContext('2d');
                    redrawCanvas(ctx, window.appCanvas);
                }

            } else {
                // 添加模式：创建新标签
                if (window.tags.some(tag => tag.name === name)) {
                    alert('标签名称已存在');
                    return;
                }

                const newTag = { name, color, opacity };
                window.tags.push(newTag);
                createTagElement(newTag, tagsList);

                // 如果是第一个标签，自动选中
                if (window.tags.length === 1) {
                    selectTag(newTag);
                }
            }

            // 关闭模态窗
            hideModal();
        });
    }
}

// 更新标签元素的函数
function updateTagElement(tag, oldName = null) {
    const tagElements = document.querySelectorAll('.tag-item');
    for (const element of tagElements) {
        const nameElement = element.querySelector('.tag-name');
        if (nameElement && (nameElement.textContent === (oldName || tag.name))) {
            // 更新名称
            nameElement.textContent = tag.name;
            
            // 更新颜色样本和透明度显示
            const colorSwatch = element.querySelector('.tag-swatch');
            const opacityLabel = element.querySelector('.tag-opacity-label');
            
            if (colorSwatch) {
                colorSwatch.style.backgroundColor = tag.color;
                colorSwatch.style.opacity = String(tag.opacity);
            }
            
            if ( opacityLabel) {
                opacityLabel.textContent = `${Math.round(tag.opacity * 100)}%`;
            }
            
            break;
        }
    }
}

// 创建标签UI元素
function createTagElement(tag, tagsList) {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag-item';

    // 创建左侧信息容器（只包含标签名称）
    const tagInfo = document.createElement('div');
    tagInfo.className = 'tag-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tag-name';
    nameSpan.textContent = tag.name;

    tagInfo.appendChild(nameSpan);

    // 创建右侧内容容器（包含元数据和操作按钮）
    const rightContent = document.createElement('div');
    rightContent.className = 'tag-right-content';

    // 元数据部分
    const metaDiv = document.createElement('div');
    metaDiv.className = 'tag-meta';

    const opacityLabel = document.createElement('span');
    opacityLabel.className = 'tag-opacity-label';
    opacityLabel.textContent = `${Math.round(tag.opacity * 100)}%`;

    const colorSwatch = document.createElement('span');
    colorSwatch.className = 'tag-swatch';
    colorSwatch.style.backgroundColor = tag.color;
    colorSwatch.style.opacity = String(tag.opacity);

    metaDiv.appendChild(opacityLabel);
    metaDiv.appendChild(colorSwatch);

    // 操作按钮容器
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'tag-actions';

    // 将元数据和操作按钮添加到右侧内容容器
    rightContent.appendChild(metaDiv);
    rightContent.appendChild(actionsContainer);

    // 将左侧信息容器和右侧内容容器添加到标签项
    tagElement.appendChild(tagInfo);
    tagElement.appendChild(rightContent);

    // Select tag on click
    tagElement.addEventListener('click', () => {
        selectTag(tag);
    });

    tagsList.appendChild(tagElement);

    // 添加删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tag-action-btn tag-delete';
    deleteBtn.title = '删除标签';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // remove from tags array
        window.tags = window.tags.filter(t => t.name !== tag.name);
        // remove element from DOM
        if (tagElement.parentNode) tagElement.parentNode.removeChild(tagElement);
        // remove polygons that used this tag
        if (window.appCanvas && window.appCanvas.drawingState) {
            const ds = window.appCanvas.drawingState;
            ds.polygons = ds.polygons.filter(p => p.tagName !== tag.name);
            // also remove from selectedPolygons if any
            ds.selectedPolygons = ds.selectedPolygons.filter(p => p.tagName !== tag.name);
            // redraw canvas
            const ctx = window.appCanvas.getContext('2d');
            redrawCanvas(ctx, window.appCanvas);
        }
        // if deleted tag was current, clear selection
        if (window.currentTag && window.currentTag.name === tag.name) {
            window.currentTag = null;
            // clear drawing state's color/opactiy to defaults if available
            if (window.appCanvas && window.appCanvas.drawingState) {
                window.appCanvas.drawingState.currentColor = '#4a90e2';
                window.appCanvas.drawingState.currentOpacity = 1;
                if (window.appCanvas) {
                    const ctx = window.appCanvas.getContext('2d');
                    redrawCanvas(ctx, window.appCanvas);
                }
            }
            const statusElement = document.getElementById('tool-status');
            if (statusElement) statusElement.textContent = '当前标签: 无';
        }
    });
    actionsContainer.appendChild(deleteBtn);

    // 添加显示/隐藏按钮
    const visBtn = document.createElement('button');
    visBtn.className = 'btn-ghost';
    visBtn.title = '显示/隐藏 标签绘制';
    visBtn.innerHTML = '👁👁';
    visBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        tag.visible = !tag.visible;
        visBtn.style.opacity = tag.visible ? '1' : '0.35';
        // redraw canvas (exclude hidden if any)
        if (window.appCanvas) {
            const ctx = window.appCanvas.getContext('2d');
            redrawCanvas(ctx, window.appCanvas);
        }
    });
    actionsContainer.appendChild(visBtn);

    // 添加编辑按钮
    const editBtn = document.createElement('button');
    editBtn.className = 'tag-action-btn tag-edit-btn';
    editBtn.title = '编辑标签';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // 使用模态窗进行编辑 - 现在可以正确调用showModal
        showModal(tag);
    });
    actionsContainer.appendChild(editBtn);
}

// 选择标签函数
function selectTag(tag) {
    // remove selected class from all tag items
    document.querySelectorAll('.tag-item').forEach(item => {
        item.classList.remove('selected');
    });

    // find and mark the matching tag element
    const tagElements = document.querySelectorAll('.tag-item');
    for (const element of tagElements) {
        const nameElement = element.querySelector('.tag-name');
        if (nameElement && nameElement.textContent === tag.name) {
            element.classList.add('selected');
            break;
        }
    }

    // set current tag globally
    window.currentTag = tag;

    // update drawing state with tag color and opacity
    if (window.appCanvas && window.appCanvas.drawingState) {
        window.appCanvas.drawingState.currentColor = tag.color;
        if (typeof tag.opacity === 'number') {
            window.appCanvas.drawingState.currentOpacity = tag.opacity;
        }
    }

    // Update status
    const statusElement = document.getElementById('tool-status');
    if (statusElement) {
        statusElement.textContent = `当前标签: ${tag.name}`;
    }

    // Also update any global color/opacity inputs if present
    const globalColorInput = document.getElementById('color-input');
    const globalOpacityInput = document.getElementById('opacity-input');
    const globalOpacityValue = document.getElementById('opacity-value');
    if (globalColorInput) globalColorInput.value = tag.color;
    if (globalOpacityInput && typeof tag.opacity === 'number') {
        globalOpacityInput.value = tag.opacity;
        if (globalOpacityValue) globalOpacityValue.textContent = `${Math.round(tag.opacity * 100)}%`;
    }
}

// Initialize toolbar
export function initToolbar() {
    // Initialize drawing logic
    const { canvas } = initDrawingLogic();
    
    // 初始化图片列表管理器
    window.imageListManager = new ImageListManager();
    
    // Get toolbar buttons
    const drawBtn = document.getElementById('draw-btn');
    const selectBtn = document.getElementById('select-btn');
    const inferenceBtn = document.getElementById('inference-btn');
    const clearBtn = document.getElementById('clear-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    
    // Add active class to track current tool
    const toolButtons = [drawBtn, selectBtn, inferenceBtn];
    
    // Store reference to canvas for external access
    window.appCanvas = canvas;
    
    // Helper function to set active button
    function setActiveButton(activeBtn) {
        toolButtons.forEach(btn => {
            if (btn && btn.classList) {
                btn.classList.remove('active');
            }
        });
        if (activeBtn && activeBtn.classList) {
            activeBtn.classList.add('active');
        }
    }
    
    // Function to enable/disable drawing tools
    function setDrawingToolsEnabled(enabled) {
        [drawBtn, selectBtn, inferenceBtn, clearBtn, exportBtn].forEach(btn => {
            if (btn) {
                btn.disabled = !enabled;
                if (enabled) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                } else {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }
            }
        });
    }
    
    // Initially enable all tools
    setDrawingToolsEnabled(true);
    
    // Add event listeners
    if (drawBtn) {
        drawBtn.addEventListener('click', () => {
            if (!drawBtn.disabled) {
                enableDrawing();
                setActiveButton(drawBtn);
            }
        });
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            if (!selectBtn.disabled) {
                enableSelectionMode();
                setActiveButton(selectBtn);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!clearBtn.disabled && confirm('确定要清空画布吗？')) {
                clearCanvas();
            }
        });
    }
    
    // Setup import/export
    setupImportButton(canvas, () => {
        // Update status message after import
        const statusElement = document.getElementById('tool-status');
        if (statusElement) {
            statusElement.textContent = '图像已导入，可以使用绘图工具';
        }
        
        // 更新图片列表按钮状态
        if (window.imageListManager) {
            window.imageListManager.updateButtonStates();
        }
        
        // Set draw as default active tool after import
        if (drawBtn && !drawBtn.disabled) {
            drawBtn.click();
        }
    });
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!exportBtn.disabled) {
                exportImage(canvas);
            }
        });
    }
    
    // 监听画布状态变化，更新图片列表按钮状态
    const updateImageListButtons = () => {
        if (window.imageListManager) {
            window.imageListManager.updateButtonStates();
        }
    };

    // 监听画布变化
    if (canvas) {
        // 使用 MutationObserver 监听画布属性变化
        const observer = new MutationObserver(updateImageListButtons);
        observer.observe(canvas, { attributes: true, attributeFilter: ['style'] });
        
        // 监听绘图状态变化
        const checkDrawingState = () => {
            if (canvas.drawingState) {
                updateImageListButtons();
            } else {
                setTimeout(checkDrawingState, 100);
            }
        };
        checkDrawingState();
    }

    // 初始更新一次
    setTimeout(updateImageListButtons, 100);
    
    // Initialize tag management
    initTagManagement();
    
    return {
        setDrawingToolsEnabled,
        canvas
    };
}

// Function to check if tools are enabled (for external modules)
export function areToolsEnabled() {
    const drawBtn = document.getElementById('draw-btn');
    return drawBtn ? !drawBtn.disabled : false;
}

// 导出标签管理相关函数，以便其他模块使用
export { selectTag, createTagElement, showModal, hideModal };
