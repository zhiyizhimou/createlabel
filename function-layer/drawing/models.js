// 绘图应用的数据模型定义
/**
 * 绘图状态类
 * @class DrawingState
 * @description 管理绘图应用的全局状态，包括绘图模式、多边形集合、选择状态等
 */
export class DrawingState {
    /**
     * 创建绘图状态实例
     * @constructor
     */
    constructor() {
        this.mode = 'none'; // 当前模式: 'none', 'draw', 'select', 'fill', 'move-vertex', 'drag-polygon'
        this.polygons = [];  // 已完成的多边形集合
        this.currentPolygon = null; // 当前正在绘制的多边形
        this.selectedPolygons = []; // 当前选中的多边形集合
        this.selectionRect = null; // 选择框状态
        this.currentColor = '#000000'; // 当前填充颜色
        this.currentOpacity = 1; // 当前填充透明度
        this.importedImage = null; // 导入的背景图像
        this.dragStartPos = null; // 拖动起始位置
        this.draggedImageOffset = { x: 0, y: 0 }; // 图像拖动偏移量
        this.activeVertexIndex = -1; // 当前活动顶点索引
        this.hoveredVertexIndex = -1; // 当前悬停的顶点索引，-1表示没有
    }

    /**
     * 开始创建新多边形
     * @returns {Polygon} 新创建的多边形实例
     */
    startNewPolygon() {
        this.currentPolygon = new Polygon();
        return this.currentPolygon;
    }

    /**
     * 完成当前多边形绘制
     * @description 将当前多边形添加到多边形集合中，并重置当前多边形
     */
    finishCurrentPolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length >= 3) {
            // Apply current drawing color and opacity to the polygon so it is filled
            if (this.currentColor) this.currentPolygon.fillColor = this.currentColor;
            if (typeof this.currentOpacity === 'number') this.currentPolygon.fillOpacity = this.currentOpacity;
            // attach tagName if a global currentTag exists
            try {
                this.currentPolygon.tagName = (window.currentTag && window.currentTag.name) ? window.currentTag.name : null;
            } catch (e) {
                this.currentPolygon.tagName = null;
            }
            this.polygons.push(this.currentPolygon);
            this.currentPolygon = null;
        }
    }

    /**
     * 取消当前多边形绘制
     * @description 放弃当前正在绘制的多边形
     */
    cancelCurrentPolygon() {
        this.currentPolygon = null;
    }

    /**
     * 清除所有选择状态
     * @description 取消所有多边形的选中状态，清空选中集合
     */
    clearSelection() {
        this.selectedPolygons.forEach(p => p.isSelected = false);
        this.selectedPolygons = [];
    }

    /**
     * 获取指定位置的多边形
     * @param {number} x - 横坐标
     * @param {number} y - 纵坐标
     * @returns {Polygon|null} 包含该点的多边形，如果没有则返回null
     */
    getPolygonAt(x, y) {
        return this.polygons.find(p => p.containsPoint(x, y));
    }

    /**
     * 填充选中的多边形
     * @param {string} color - 填充颜色（十六进制颜色值）
     * @param {number} opacity - 填充透明度（0-1之间）
     */
    fillSelectedPolygons(color, opacity) {
        this.selectedPolygons.forEach(p => {
            p.fillColor = color;
            p.fillOpacity = opacity;
            try {
                p.tagName = (window.currentTag && window.currentTag.name) ? window.currentTag.name : p.tagName || null;
            } catch (e) {
                // ignore
            }
        });
    }

    /**
     * 设置导入的图像
     * @param {HTMLImageElement} img - 导入的图像元素
     */
    setImportedImage(img) {
        this.importedImage = img;
    }

    /**
     * 开始拖动多边形
     * @param {number} x - 鼠标按下位置的横坐标
     * @param {number} y - 鼠标按下位置的纵坐标
     * @description 记录拖动起始位置，并设置模式为拖动多边形
     */
    startDraggingPolygon(x, y) {
        if (this.selectedPolygons.length === 1) {
            this.dragStartPos = { x, y };
            this.mode = 'drag-polygon';
            this.selectedPolygons[0].dragOffset = { x: 0, y: 0 };
        }
    }

    /**
     * 更新被拖动多边形的位置
     * @param {number} x - 当前鼠标位置的横坐标
     * @param {number} y - 当前鼠标位置的纵坐标
     * @description 计算拖动偏移量并更新多边形所有顶点位置
     */
    updateDraggedPolygon(x, y) {
        if (this.dragStartPos && this.selectedPolygons.length === 1) {
            const polygon = this.selectedPolygons[0];
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            
            // 更新所有顶点位置
            polygon.vertices.forEach(vertex => {
                vertex.x += dx;
                vertex.y += dy;
            });
            
            // 更新拖动偏移量
            polygon.dragOffset.x += dx;
            polygon.dragOffset.y += dy;
            
            // 更新拖动起始位置
            this.dragStartPos = { x, y };
        }
    }

    /**
     * 停止拖动多边形
     * @description 重置拖动状态，恢复为选择模式
     */
    stopDraggingPolygon() {
        this.dragStartPos = null;
        this.mode = 'select';
    }

    /**
     * 开始移动顶点
     * @param {Polygon} polygon - 要编辑的多边形
     * @param {number} vertexIndex - 要移动的顶点索引
     * @param {number} x - 鼠标按下位置的横坐标
     * @param {number} y - 鼠标按下位置的纵坐标
     * @description 记录活动顶点和拖动起始位置，设置模式为移动顶点
     */
    startMovingVertex(polygon, vertexIndex, x, y) {
        this.activeVertexIndex = vertexIndex;
        this.dragStartPos = { x, y };
        this.mode = 'move-vertex';
    }

    /**
     * 更新顶点位置
     * @param {number} x - 当前鼠标位置的横坐标
     * @param {number} y - 当前鼠标位置的纵坐标
     * @description 计算拖动偏移量并更新活动顶点位置
     */
    updateVertexPosition(x, y) {
        if (this.dragStartPos && this.activeVertexIndex >= 0 && this.selectedPolygons.length > 0) {
            const polygon = this.selectedPolygons[0];
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            
            // 更新顶点位置
            polygon.vertices[this.activeVertexIndex].x += dx;
            polygon.vertices[this.activeVertexIndex].y += dy;
            
            // 更新拖动起始位置
            this.dragStartPos = { x, y };
        }
    }

    /**
     * 停止移动顶点
     * @description 重置顶点移动状态，恢复为选择模式
     */
    stopMovingVertex() {
        this.activeVertexIndex = -1;
        this.dragStartPos = null;
        this.mode = 'select';
    }
}

/**
 * 多边形类
 * @class Polygon
 * @description 表示一个多边形，包含顶点集合和绘制方法
 */
export class Polygon {
    /**
     * 创建多边形实例
     * @constructor
     */
    constructor() {
        this.vertices = []; // 顶点集合
        this.isSelected = false; // 是否被选中
        this.fillColor = null; // 填充颜色
        this.fillOpacity = 1; // 填充透明度
        this.dragOffset = { x: 0, y: 0 }; // 拖动偏移量
    }

    /**
     * 添加顶点
     * @param {number} x - 顶点横坐标
     * @param {number} y - 顶点纵坐标
     */
    addVertex(x, y) {
        this.vertices.push({ x, y });
    }

    /**
     * 检查点是否在多边形内部
     * @param {number} x - 检查点的横坐标
     * @param {number} y - 检查点的纵坐标
     * @returns {boolean} 如果点在多边形内部则返回true
     * @description 使用射线法判断点是否在多边形内部
     */
    containsPoint(x, y) {
        if (this.vertices.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x, yi = this.vertices[i].y;
            const xj = this.vertices[j].x, yj = this.vertices[j].y;
            
            // 射线法判断点是否在多边形内部
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * 检查点是否接近第一个顶点
     * @param {number} x - 检查点的横坐标
     * @param {number} y - 检查点的纵坐标
     * @param {number} radius - 判定半径，默认为10像素
     * @returns {boolean} 如果点在第一个顶点的判定半径内则返回true
     */
    isNearFirstVertex(x, y, radius = 10) {
        if (this.vertices.length === 0) return false;
        const first = this.vertices[0];
        return Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2) <= radius;
    }

    /**
     * 绘制多边形
     * @param {CanvasRenderingContext2D} ctx - Canvas绘图上下文
     * @param {boolean} isCurrent - 是否为当前正在绘制的多边形
     * @description 根据多边形状态绘制边框、填充和顶点
     */
    draw(ctx, isCurrent = false) {
        if (this.vertices.length < 2) return;
        
        // 开始绘制路径
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        
        // 绘制所有边
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        
        // 如果不是当前绘制的多边形且顶点数>=3，则闭合路径
        if (!isCurrent && this.vertices.length >= 3) {
            ctx.closePath();
        }
        
        // 设置描边样式
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.isSelected ? '#FF0000' : '#000000';
        ctx.stroke();
        
        // 只有已完成的多边形（非当前绘制）才进行填充
        if (!isCurrent && this.fillColor && this.vertices.length >= 3) {
            ctx.fillStyle = this.fillColor;
            ctx.globalAlpha = this.fillOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // 如果多边形被选中，绘制顶点
        if (this.isSelected) {
            ctx.fillStyle = '#FF0000';
            this.vertices.forEach(v => {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
}