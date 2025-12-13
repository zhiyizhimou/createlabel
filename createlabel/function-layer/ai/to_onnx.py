import sys
import os
import torch

# 加入父目录到系统路径（确保能导入 xunlian.py 中的模型）
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(parent_dir)

# 从训练代码（xunlian.py）中导入正确的模型类
from xunlian import UNetPlusPlus

# -------------------------- 关键配置（与训练代码一致） --------------------------
MODEL_WEIGHT_PATH = "best_model.pth"
INPUT_CHANNELS = 3
OUTPUT_CHANNELS = 1
INPUT_SIZE = 256  
ONNX_SAVE_PATH = "unet_segmentation.onnx"
# ----------------------------------------------------------------


model = UNetPlusPlus(in_channels=INPUT_CHANNELS, out_channels=OUTPUT_CHANNELS)


if not os.path.exists(MODEL_WEIGHT_PATH):
    raise FileNotFoundError(f"权重文件未找到！请确保 {MODEL_WEIGHT_PATH} 存在于当前目录")
try:
    model.load_state_dict(torch.load(MODEL_WEIGHT_PATH, map_location="cpu", weights_only=True))
    print(f"成功加载权重文件: {MODEL_WEIGHT_PATH}")
except RuntimeError as e:
    raise RuntimeError(f"权重与模型结构不匹配：{e}") from e


model.eval()


dummy_input = torch.randn(1, INPUT_CHANNELS, INPUT_SIZE, INPUT_SIZE)

# 5. 导出ONNX模型（适配动态padding、BatchNorm等操作）
torch.onnx.export(
    model=model,
    args=dummy_input,
    f=ONNX_SAVE_PATH,
    export_params=True,  # 导出带权重的模型
    opset_version=11,  # 兼容大部分推理框架
    input_names=["input"],  # 输入节点名称（方便后续推理调用）
    output_names=["output"],  # 输出节点名称
    dynamic_axes={
        "input": {0: "batch_size"},  # 支持动态batch_size（可选）
        "output": {0: "batch_size"}
    },
    dynamo=False,  # 禁用新导出器，确保兼容性
    do_constant_folding=True  # 折叠常量，优化模型体积
)

print(f"ONNX模型导出成功！保存路径：{ONNX_SAVE_PATH}")
print(f"模型输入格式：(batch_size, {INPUT_CHANNELS}, {INPUT_SIZE}, {INPUT_SIZE})")
print(f"模型输出格式：(batch_size, {OUTPUT_CHANNELS}, {INPUT_SIZE}, {INPUT_SIZE})")