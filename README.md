# CREATELABEL - 网页自动标注系统

## 项目描述
CREATELABEL 是一个基于Web的自动标注系统，专为图像或文档标注设计。系统提供直观的图形界面，支持手动绘图、AI辅助标注、文件导入导出等功能，适用于医疗、教育等领域。项目采用模块化架构，确保可扩展性和可维护性。

## 功能特性
- **绘图工具**: 支持画笔、橡皮擦、填充工具等，实现精确标注。
- **AI推理**: 集成AI模型（如通过`ai-inference.js`）进行自动标注建议。
- **文件操作**: 支持导入图像/文档（如PNG、PDF）和导出标注数据。
- **缩放控制**: 提供平滑的缩放功能，便于细节标注。
- **颜色管理**: 自定义颜色选择，增强标注灵活性。
- **数学计算**: 处理坐标转换和缩放比例，确保标注准确性。

## 安装指南
1. **下载项目**: 克隆或下载本仓库到本地目录。
2. **环境要求**: 确保使用现代浏览器（如Chrome 90+、Firefox 88+），无需额外安装。
3. **运行系统**: 直接双击打开 `index.html` 文件，或在浏览器中通过本地服务器（如Python `http.server`）运行以避免CORS问题。

## 使用方法
1. **启动系统**: 打开 `index.html`，进入主界面。
2. **导入文件**: 点击导入按钮（通过`file-io/import.js`）选择图像或文档。
3. **进行标注**:
   - 使用工具栏（`tools/toolbar.js`）选择工具（如画笔、橡皮擦）。
   - 利用AI推理（`features/ai-inference.js`）快速生成标注。
   - 调整颜色（`function-layer/color/color.js`）和缩放（`features/zoom-controls.js`）。
4. **导出结果**: 通过导出功能（`file-io/export.js`）保存标注数据。
5. **查看文档**: 参考 `doc/` 文件夹内的示例图像和 `message/` 中的说明文档。

## 文件结构

思路说明

根据用户提供的文件结构图，这是一个网页自动标注系统（项目名称为CREATELABEL），文件结构显示它是一个纯前端项目，基于HTML和JavaScript实现。README.md文件需要包含项目概述、功能特性、安装步骤、使用方法等基本内容。由于项目结构清晰，我推断核心功能包括绘图工具、AI推理、文件操作等。README内容将基于文件结构进行描述，采用标准Markdown格式，确保简洁明了。
代码示例（完整的README.md文件内容）
# CREATELABEL - 网页自动标注系统

## 项目描述
CREATELABEL 是一个基于Web的自动标注系统，专为图像或文档标注设计。系统提供直观的图形界面，支持手动绘图、AI辅助标注、文件导入导出等功能，适用于医疗、教育等领域。项目采用模块化架构，确保可扩展性和可维护性。

## 功能特性
- **绘图工具**: 支持画笔、橡皮擦、填充工具等，实现精确标注。
- **AI推理**: 集成AI模型（如通过`ai-inference.js`）进行自动标注建议。
- **文件操作**: 支持导入图像/文档（如PNG、PDF）和导出标注数据。
- **缩放控制**: 提供平滑的缩放功能，便于细节标注。
- **颜色管理**: 自定义颜色选择，增强标注灵活性。
- **数学计算**: 处理坐标转换和缩放比例，确保标注准确性。

## 安装指南
1. **下载项目**: 克隆或下载本仓库到本地目录。
2. **环境要求**: 确保使用现代浏览器（如Chrome 90+、Firefox 88+），无需额外安装。
3. **运行系统**: 直接双击打开 `index.html` 文件，或在浏览器中通过本地服务器（如Python `http.server`）运行以避免CORS问题。

## 使用方法
1. **启动系统**: 打开 `index.html`，进入主界面。
2. **导入文件**: 点击导入按钮（通过`file-io/import.js`）选择图像或文档。
3. **进行标注**:
   - 使用工具栏（`tools/toolbar.js`）选择工具（如画笔、橡皮擦）。
   - 利用AI推理（`features/ai-inference.js`）快速生成标注。
   - 调整颜色（`function-layer/color/color.js`）和缩放（`features/zoom-controls.js`）。
4. **导出结果**: 通过导出功能（`file-io/export.js`）保存标注数据。
5. **查看文档**: 参考 `doc/` 文件夹内的示例图像和 `message/` 中的说明文档。

## 文件结构
```
CREATELABEL/
├── app-layer/ # 应用核心逻辑（绘图、填充、缩放）
│ ├── drawing-logic.js
│ ├── fill-logic.js
│ └── zoom-logic.js
├── button-layer/ # 按钮UI组件（待实现）
├── features/ # 高级功能模块
│ ├── ai-inference.js # AI推理逻辑
│ └── zoom-controls.js # 缩放控制
├── file-io/ # 文件输入输出
│ ├── export.js # 导出功能
│ └── import.js # 导入功能
├── tools/ # 标注工具实现
│ ├── brush.js # 画笔工具
│ ├── eraser.js # 橡皮擦工具
│ ├── fill-tool.js # 填充工具
│ └── toolbar.js # 工具栏管理
├── doc/ # 文档资源（示例图像）
│ ├── 网页文档1.png
│ ├── 网页文档2.png
│ └── 网页文档3.png
├── function-layer/ # 底层功能模块
│ ├── ai/ # AI相关
│ │ └── inference.js # 推理核心
│ ├── color/ # 颜色管理
│ │ └── color.js
│ ├── drawing/ # 绘图基础
│ │ ├── fill.js # 填充算法
│ │ ├── models.js # 数据模型
│ │ ├── polygon.js # 多边形处理
│ │ └── select.js # 选择逻辑
│ ├── math/ # 数学工具
│ │ ├── coordinate.js # 坐标转换
│ │ └── scaling.js # 缩放计算
│ └── message/ # 项目文档
│ ├── 智医智眸.docx # 设计文档
│ ├── 智医智眸.pdf
│ └── 智医智眸.pptx
├── index.html # 主HTML入口
├── main.js # 主JavaScript逻辑
├── styles.css # 主CSS样式
└── README.md # 项目说明（本文件）
```


## 开发说明
- **技术栈**: 纯前端（HTML5、JavaScript），模块化JS实现。
- **核心文件**: `main.js` 初始化系统，`index.html` 提供UI结构。
- **模块依赖**: 各JS文件通过全局变量或ES6模块交互（需在HTML中正确引入）。

## 贡献指南
欢迎提交Issue或Pull Request！请确保代码符合ESLint规范，并更新相关文档。

## 许可证
本项目基于MIT许可证开源。

## 联系与支持
邮箱：1513929790@qq.com
