// Toolbar controller for UI interactions
import { initDrawingLogic, enableDrawing, enableSelectionMode, clearCanvas } from '../app-layer/drawing-logic.js';
import { redrawCanvas } from '../function-layer/drawing/polygon.js';
import { setupImportButton } from './file-io/import.js';
import { exportImage } from './file-io/export.js';

// Initialize toolbar
export function initToolbar() {
    // Initialize drawing logic
    const { canvas } = initDrawingLogic();
    
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
    
    // Initially enable all tools (no longer disabling before import)
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
    
    // Initialize tag management
    initTagManagement();
    
    return {
        setDrawingToolsEnabled,
        canvas
    };
}

// Initialize tag management system
function initTagManagement() {
    const tagNameInput = document.getElementById('tag-name-input');
    const tagColorInput = document.getElementById('tag-color-input');
    const tagOpacityInput = document.getElementById('tag-opacity-input');
    const tagOpacityValue = document.getElementById('tag-opacity-value');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');

    // Store tags and current selected tag
    window.tags = [];
    window.currentTag = null;

    // Add tag button event (only when elements exist)
    if (addTagBtn && tagNameInput && tagColorInput && tagsList) {
        addTagBtn.addEventListener('click', () => {
            const name = tagNameInput.value.trim();
            const color = tagColorInput.value;
            const opacity = (tagOpacityInput && !isNaN(parseFloat(tagOpacityInput.value))) ? parseFloat(tagOpacityInput.value) : 1;

            if (!name) {
                alert('\u8bf7\u8f93\u5165\u6807\u7b7e\u540d\u79f0');
                return;
            }

            // Check if tag name already exists
            if (window.tags.some(tag => tag.name === name)) {
                alert('\u6807\u7b7e\u540d\u79f0\u5df2\u5b58\u5728');
                return;
            }

            // Create new tag
            const newTag = { name, color, opacity };
            window.tags.push(newTag);

            // Add tag to UI -- create elements so we can reference them later
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'tag-name';
            nameSpan.textContent = name;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'tag-meta';

            const opacityLabel = document.createElement('span');
            opacityLabel.className = 'tag-opacity-label';
            opacityLabel.textContent = `${Math.round(opacity * 100)}%`;

            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'tag-color';
            colorSwatch.style.backgroundColor = color;
            colorSwatch.style.opacity = String(opacity);

            metaDiv.appendChild(opacityLabel);
            metaDiv.appendChild(colorSwatch);

            tagElement.appendChild(nameSpan);
            tagElement.appendChild(metaDiv);

            // Select tag on click
            tagElement.addEventListener('click', () => {
                selectTag(newTag);
            });

            tagsList.appendChild(tagElement);

            // add delete button for the tag
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tag-delete';
            deleteBtn.title = '删除标签';
            deleteBtn.textContent = '删除';
            deleteBtn.style.marginLeft = '8px';
            deleteBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                // remove from tags array
                window.tags = window.tags.filter(t => t.name !== newTag.name);
                // remove element from DOM
                if (tagElement.parentNode) tagElement.parentNode.removeChild(tagElement);
                // remove polygons that used this tag
                if (window.appCanvas && window.appCanvas.drawingState) {
                    const ds = window.appCanvas.drawingState;
                    ds.polygons = ds.polygons.filter(p => p.tagName !== newTag.name);
                    // also remove from selectedPolygons if any
                    ds.selectedPolygons = ds.selectedPolygons.filter(p => p.tagName !== newTag.name);
                    // redraw canvas
                    const ctx = window.appCanvas.getContext('2d');
                    redrawCanvas(ctx, window.appCanvas);
                }
                // if deleted tag was current, clear selection
                if (window.currentTag && window.currentTag.name === newTag.name) {
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
            tagElement.appendChild(deleteBtn);

            // add edit button for the tag
            const editBtn = document.createElement('button');
            editBtn.className = 'tag-edit-btn';
            editBtn.title = '编辑标签';
            editBtn.textContent = '编辑';
            editBtn.style.marginLeft = '6px';
            tagElement.appendChild(editBtn);

            // inline edit panel (hidden by default)
            const editPanel = document.createElement('div');
            editPanel.className = 'tag-edit-panel';
            editPanel.style.display = 'none';

            const editColor = document.createElement('input');
            editColor.type = 'color';
            editColor.value = color;

            const editOpacity = document.createElement('input');
            editOpacity.type = 'range';
            editOpacity.min = 0;
            editOpacity.max = 1;
            editOpacity.step = 0.1;
            editOpacity.value = String(opacity);

            const editOpacityLabel = document.createElement('span');
            editOpacityLabel.className = 'tag-opacity-label-small';
            editOpacityLabel.textContent = `${Math.round(opacity * 100)}%`;

            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存';
            saveBtn.className = 'tag-save-btn';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.className = 'tag-cancel-btn';

            editPanel.appendChild(editColor);
            editPanel.appendChild(editOpacity);
            editPanel.appendChild(editOpacityLabel);
            editPanel.appendChild(saveBtn);
            editPanel.appendChild(cancelBtn);

            tagElement.appendChild(editPanel);

            // toggle edit panel
            editBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                editPanel.style.display = editPanel.style.display === 'none' ? 'flex' : 'none';
            });

            // live update while editing
            function applyLiveUpdate(newColor, newOpacity) {
                // update tag object
                newTag.color = newColor;
                newTag.opacity = newOpacity;

                // update UI swatch and opacity label
                colorSwatch.style.backgroundColor = newColor;
                colorSwatch.style.opacity = String(newOpacity);
                opacityLabel.textContent = `${Math.round(newOpacity * 100)}%`;
                editOpacityLabel.textContent = `${Math.round(newOpacity * 100)}%`;

                // if this tag is currentTag, update drawingState
                if (window.currentTag && window.currentTag.name === newTag.name) {
                    window.appCanvas.drawingState.currentColor = newColor;
                    window.appCanvas.drawingState.currentOpacity = newOpacity;
                }

                // update all polygons that use this tag
                if (window.appCanvas && window.appCanvas.drawingState) {
                    const ds = window.appCanvas.drawingState;
                    ds.polygons.forEach(p => {
                        if (p.tagName === newTag.name) {
                            p.fillColor = newColor;
                            p.fillOpacity = newOpacity;
                        }
                    });
                    // redraw
                    const ctx = window.appCanvas.getContext('2d');
                    redrawCanvas(ctx, window.appCanvas);
                }
            }

            editColor.addEventListener('input', () => applyLiveUpdate(editColor.value, parseFloat(editOpacity.value)));
            editOpacity.addEventListener('input', () => applyLiveUpdate(editColor.value, parseFloat(editOpacity.value)));

            // save/cancel
            saveBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                editPanel.style.display = 'none';
            });
            cancelBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                // revert UI to tag values
                editColor.value = newTag.color;
                editOpacity.value = String(newTag.opacity);
                applyLiveUpdate(newTag.color, newTag.opacity);
                editPanel.style.display = 'none';
            });

            // Clear input
            tagNameInput.value = '';

            // Select this tag if it's the first one
            if (window.tags.length === 1) {
                selectTag(newTag);
            }
        });
    }
    // update opacity display when slider changes (if present)
    if (tagOpacityInput && tagOpacityValue) {
        tagOpacityInput.addEventListener('input', () => {
            const v = parseFloat(tagOpacityInput.value);
            tagOpacityValue.textContent = `${Math.round(v * 100)}%`;
        });
    }
}
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

// Function to check if tools are enabled (for external modules)
export function areToolsEnabled() {
    const drawBtn = document.getElementById('draw-btn');
    return drawBtn ? !drawBtn.disabled : false;
}