from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as rt
from PIL import Image
import io
import numpy as np
import torchvision.transforms as transforms
import base64
# 新增：导入边缘叠加函数
from overlay_edges import overlay_mask_edges
# 新增：若需复用using.py的后处理逻辑，可导入相关函数
from using import generate_black_white_mask, PARAMS_MAP, get_data_category  # 根据实际路径调整

app = Flask(__name__)
CORS(app)

# 加载ONNX模型
session = rt.InferenceSession("unet_segmentation.onnx")
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# 图像预处理
preprocess = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# 改进后处理：复用using.py的自适应逻辑（替代原postprocess_mask）
def postprocess_mask(mask_prob, image_path=None):
    # 自动判断数据类别以获取对应参数
    if image_path:
        data_category = get_data_category(image_path)
        params = PARAMS_MAP[data_category]
    else:
        # 若无法获取图像路径，使用默认参数
        params = PARAMS_MAP["small_dense"]
    
    # 应用自适应阈值和形态学操作
    mask_prob = mask_prob.squeeze()  # 去除多余维度
    binary_mask = generate_black_white_mask(mask_prob, params)
    return binary_mask

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "请上传图像"}), 400
    
    # 读取上传的图像
    image_file = request.files['image']
    image = Image.open(image_file).convert('RGB')
    original_size = image.size  # 记录原图尺寸
    
    # 保存临时图像用于类别判断（可选，若postprocess_mask需要）
    temp_path = "temp_image.png"
    image.save(temp_path)
    
    # 预处理图像
    input_tensor = preprocess(image).unsqueeze(0).numpy()
    
    # ONNX模型推理
    output = session.run([output_name], {input_name: input_tensor})[0]
    mask_prob = 1 / (1 + np.exp(-output))  # 计算sigmoid
    
    # 后处理生成掩码（使用改进的逻辑）
    binary_mask = postprocess_mask(mask_prob, temp_path)
    mask_image = Image.fromarray(binary_mask).resize(original_size, Image.NEAREST)
    
    # 新增：生成边缘叠加图像
    edge_overlay = overlay_mask_edges(
        original_image=image,
        mask_image=mask_image,
        edge_color=(0, 255, 0),  # 绿色边缘
        edge_thickness=2
    )
    
    # 转为Base64编码
    # 1. 掩码图像
    mask_buffer = io.BytesIO()
    mask_image.save(mask_buffer, format="PNG")
    mask_base64 = base64.b64encode(mask_buffer.getvalue()).decode('utf-8')
    
    # 2. 边缘叠加图像
    overlay_buffer = io.BytesIO()
    edge_overlay.save(overlay_buffer, format="PNG")
    overlay_base64 = base64.b64encode(overlay_buffer.getvalue()).decode('utf-8')
    
    # 清理临时文件
    import os
    os.remove(temp_path)
    
    # 扩展返回结果
    return jsonify({
        "mask": mask_base64,
        "overlay": overlay_base64  # 新增边缘叠加图
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)