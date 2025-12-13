import os
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import matplotlib.pyplot as plt
import cv2
from tqdm import tqdm
from overlay_edges import overlay_mask_edges

# -------------------------- 1. 类别-参数映射表（扩展为三个区间） --------------------------
PARAMS_MAP = {
    "small_dense": {  # 小目标密集型（空白少：0-50%）
        "PATCH_SIZE": 256,
        "OVERLAP": 128,  # 高重叠率，避免小目标在分块边界丢失
        "MIN_OBJ_AREA": 90,  # 保留更多小目标
        "MAX_OBJ_AREA": 1500,
        "GAUSSIAN_KERNEL": (3, 3),# 高斯模糊核
        "OPEN_KERNEL": (3, 3),  # 开运算核（先小后大）去噪去粘滞
        "OPEN_ITER": 2,
        "CLOSE_KERNEL": (2, 2),  # 轻度闭运算，修复小目标空洞
        "CLOSE_ITER": 1,
        "QUANTILE": 0.65,  # 适中分位数，不过滤过多候选目标
        "STD_WEIGHT": 0.7,
        "THRESH_LOW": 0.25,
    },
    "medium_sparse": {  # 中等目标分散型（空白中等：50%-75%）
        "PATCH_SIZE": 200,  # 中等分块，平衡目标大小
        "OVERLAP": 120,
        "MIN_OBJ_AREA": 50,  # 过滤更小噪声
        "MAX_OBJ_AREA": 3000,
        "GAUSSIAN_KERNEL": (3, 3),
        "OPEN_KERNEL": (3, 3),  # 中度开运算，去除粘连
        "OPEN_ITER": 1,
        "CLOSE_KERNEL": (2, 2),
        "CLOSE_ITER": 1,
        "QUANTILE": 0.6,  # 稍低阈值，适应中等空白占比
        "STD_WEIGHT": 0.8,
        "THRESH_LOW": 0.25,
    },
    "large_sparse": {  # 大目标稀疏型（空白多：75%-100%）
        "PATCH_SIZE": 150,  # 更大分块，适配稀疏大目标
        "OVERLAP": 120,  # 低重叠率，减少计算量
        "MIN_OBJ_AREA": 50,  # 过滤更多小噪声（空白多，小区域更可能是噪声）
        "MAX_OBJ_AREA": 1000,  # 允许更大目标存在
        "GAUSSIAN_KERNEL": (3, 3),  # 更强模糊，平滑大区域
        "OPEN_KERNEL": (3, 3),  # 强开运算，去除孤立噪声点
        "OPEN_ITER": 1,
        "CLOSE_KERNEL": (2, 2),  # 强闭运算，修复大目标内部空洞
        "CLOSE_ITER": 1,
        "QUANTILE": 0.5,  # 更低分位数，捕捉稀疏目标
        "STD_WEIGHT": 0.9,  # 增强标准差影响，严格过滤假阳性
        "THRESH_LOW": 0.25,  # 稍低下限，避免漏检稀疏目标
    }
}

#TCGA-2Z-A9J9-01A-01-TS1.tif
#01_1.png   C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/training/images/ytma10_010704_benign1_ccd.tif
#C:\Users\上杉初绘\Desktop\app\dachuang\MoNuSeg\test\images\肺结节数据集\processed_images\LIDC-IDRI-1001_nodule0_slice3.png
# 全局固定参数
MODEL_PATH = "C:/Users/上杉初绘/Desktop/app/dachuang/best_model.pth"
INPUT_IMAGE_PATH = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/training/images/TCGA-2Z-A9J9-01A-01-TS1.tif"
N_CHANNELS = 3
TRAIN_IMG_SIZE = 256
# 三个区间的临界值（0-50%、50%-75%、75%-100%）
LOW_THRESHOLD = 0.5    # 50%
HIGH_THRESHOLD = 0.75  # 75%

# -------------------------- 空白面积计算函数（不变） --------------------------
def calculate_blank_ratio(image_path, downscale=4):
    """计算图片空白面积占比（空白=背景区域）"""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    # 降采样加快计算
    img_small = img.resize((w//downscale, h//downscale))
    img_np = np.array(img_small)
    
    # 预处理：模糊去噪 + 灰度化
    img_blur = cv2.GaussianBlur(img_np, (5, 5), 0)
    gray = cv2.cvtColor(img_blur, cv2.COLOR_RGB2GRAY)
    
    # Otsu自动阈值分割（分离背景和前景）
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 统计空白像素数（默认白色为空白，可根据数据集调整）
    blank_pixels = np.sum(binary == 255)
    total_pixels = binary.size
    blank_ratio = blank_pixels / total_pixels
    
    return blank_ratio

# -------------------------- 类别判断函数（修改为三区间） --------------------------
def get_data_category(image_path, category_marker=None):
    """优先级：手动指定 > 三区间空白面积判断 > 关键词判断"""
    # 1. 手动指定
    if category_marker is not None:
        if category_marker in PARAMS_MAP.keys():
            return category_marker
        raise ValueError(f"类别必须是{PARAMS_MAP.keys()}中的一种")
    
    # 2. 三区间空白面积判断（核心）
    blank_ratio = calculate_blank_ratio(image_path)
    print(f"图片空白面积占比：{blank_ratio:.3f}（低临界值：{LOW_THRESHOLD}，高临界值：{HIGH_THRESHOLD}）")
    
    if blank_ratio <= LOW_THRESHOLD:
        return "small_dense"    # 空白少（0-50%）→ 小目标密集
    elif LOW_THRESHOLD < blank_ratio <= HIGH_THRESHOLD:
        return "medium_sparse"  # 空白中等（50%-75%）→ 中等目标分散
    else:
        return "large_sparse"   # 空白多（75%-100%）→ 大目标稀疏
    
    # 3. 关键词判断（备选）
    file_name = os.path.basename(image_path).lower()
    if "small" in file_name or "dense" in file_name:
        return "small_dense"
    elif "medium" in file_name or "sparse" in file_name:
        return "medium_sparse"
    elif "large" in file_name:
        return "large_sparse"
    return "small_dense"

# ----------------------------------------------------------------
# 2. 模型结构（保持不变）
class UNetPlusPlus(nn.Module):
    def __init__(self, in_channels=3, out_channels=1):
        super().__init__()
        self.enc1 = self.double_conv(in_channels, 64)
        self.enc2 = self.double_conv(64, 128)
        self.enc3 = self.double_conv(128, 256)
        self.enc4 = self.double_conv(256, 512)
        self.bottleneck = self.double_conv(512, 1024)
        self.up4 = self.up_conv(1024, 512)
        self.dec4 = self.double_conv(1024, 512)
        self.up3 = self.up_conv(512, 256)
        self.dec3 = self.double_conv(512, 256)
        self.up2 = self.up_conv(256, 128)
        self.dec2 = self.double_conv(256, 128)
        self.up1 = self.up_conv(128, 64)
        self.dec1 = self.double_conv(128, 64)
        self.outc = nn.Conv2d(64, out_channels, kernel_size=1)
        self.attention = nn.Sequential(nn.Conv2d(64, 1, 1), nn.Sigmoid())

    def double_conv(self, in_channels, out_channels):
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def up_conv(self, in_channels, out_channels):
        return nn.ConvTranspose2d(in_channels, out_channels, 2, stride=2)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(nn.MaxPool2d(2)(e1))
        e3 = self.enc3(nn.MaxPool2d(2)(e2))
        e4 = self.enc4(nn.MaxPool2d(2)(e3))
        b = self.bottleneck(nn.MaxPool2d(2)(e4))
        d4 = self.up4(b)
        d4 = self.pad_to_match(d4, e4)
        d4 = torch.cat([d4, e4], 1)
        d4 = self.dec4(d4)
        d3 = self.up3(d4)
        d3 = self.pad_to_match(d3, e3)
        d3 = torch.cat([d3, e3], 1)
        d3 = self.dec3(d3)
        d2 = self.up2(d3)
        d2 = self.pad_to_match(d2, e2)
        d2 = torch.cat([d2, e2], 1)
        d2 = self.dec2(d2)
        d1 = self.up1(d2)
        d1 = self.pad_to_match(d1, e1)
        d1 = torch.cat([d1, e1], 1)
        d1 = self.dec1(d1)
        out = self.outc(d1)
        attn = self.attention(d1)
        return out * attn

    def pad_to_match(self, x, target):
        x_h, x_w = x.shape[2], x.shape[3]
        t_h, t_w = target.shape[2], target.shape[3]
        pad_h = max(0, t_h - x_h)
        pad_w = max(0, t_w - x_w)
        return torch.nn.functional.pad(x, (pad_w//2, pad_w - pad_w//2, pad_h//2, pad_h - pad_h//2), mode='constant')

# -------------------------- 3. 自适应核心函数（保持参数适配性） --------------------------
def optimized_infer(image_path, model, device, params, img_size=256):
    """动态接收类别参数的推理函数"""
    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    img_np = np.array(image)
    pred_mask = np.zeros((h, w), dtype=np.float32)
    count = np.ones((h, w), dtype=np.float32)
    
    model.eval()
    with torch.no_grad():
        # 使用当前类别对应的分块和重叠率
        step_y = params["PATCH_SIZE"] - params["OVERLAP"]
        step_x = params["PATCH_SIZE"] - params["OVERLAP"]
        for y in tqdm(range(0, h, step_y), desc="推理中"):
            for x in range(0, w, step_x):
                y_end = min(y + params["PATCH_SIZE"], h)
                x_end = min(x + params["PATCH_SIZE"], w)
                y_start = max(0, y_end - params["PATCH_SIZE"])
                x_start = max(0, x_end - params["PATCH_SIZE"])
                
                patch = Image.fromarray(img_np[y_start:y_end, x_start:x_end])
                patch = transforms.Resize((img_size, img_size))(patch)
                patch_tensor = transforms.Compose([
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])(patch).unsqueeze(0).to(device)
                
                output = model(patch_tensor)
                patch_pred = torch.sigmoid(output).squeeze().cpu().numpy()
                patch_pred = cv2.resize(patch_pred, (x_end - x_start, y_end - y_start))
                pred_mask[y_start:y_end, x_start:x_end] += patch_pred
                count[y_start:y_end, x_start:x_end] += 1
    
    pred_mask /= count
    return image, pred_mask

def get_adaptive_threshold(prob_mask, params):
    """根据类别参数计算自适应阈值"""
    quantile = np.quantile(prob_mask, params["QUANTILE"])
    mean_std = prob_mask.mean() + params["STD_WEIGHT"] * prob_mask.std()
    return max(params["THRESH_LOW"], min(max(quantile, mean_std), 0.75))

def separate_connected_objects(mask, params):
    """根据类别参数过滤连通域"""
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    output_mask = np.zeros_like(mask)
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        # 使用当前类别对应的目标面积阈值
        if params["MIN_OBJ_AREA"] < area < params["MAX_OBJ_AREA"]:
            output_mask[labels == i] = 255
    
    return output_mask

def generate_black_white_mask(prob_mask, params):
    """根据类别参数执行形态学操作"""
    # 自适应平滑
    prob_smoothed = cv2.GaussianBlur(prob_mask, params["GAUSSIAN_KERNEL"], 0)
    # 自适应阈值
    thresh = get_adaptive_threshold(prob_smoothed, params)
    binary_mask = (prob_smoothed > thresh).astype(np.uint8) * 255
    
    # 自适应开运算（去噪/去小粘连）
    open_kernel = np.ones(params["OPEN_KERNEL"], np.uint8)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, open_kernel, iterations=params["OPEN_ITER"])
    
    # 连通域过滤
    binary_mask = separate_connected_objects(binary_mask, params)
    
    # 自适应闭运算（修复空洞）
    close_kernel = np.ones(params["CLOSE_KERNEL"], np.uint8)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, close_kernel, iterations=params["CLOSE_ITER"])
    
    return binary_mask

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"当前使用设备: {device}")

    # 提前定义base_name
    base_name = os.path.splitext(os.path.basename(INPUT_IMAGE_PATH))[0]

    # 加载模型
    model = UNetPlusPlus(in_channels=N_CHANNELS, out_channels=1).to(device)
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"模型权重未找到: {MODEL_PATH}")
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        print(f"成功加载权重: {MODEL_PATH}")
    except RuntimeError as e:
        raise RuntimeError(f"结构不匹配: {e}") from e

    # 自动判断类别（三区间）
    data_category = get_data_category(INPUT_IMAGE_PATH)
    params = PARAMS_MAP[data_category]
    print(f"基于空白面积判断数据类别：{data_category}，使用对应参数配置")

    # 推理和掩码生成
    original_image, prob_mask = optimized_infer(INPUT_IMAGE_PATH, model, device, params, img_size=TRAIN_IMG_SIZE)
    black_white_mask = generate_black_white_mask(prob_mask, params)

    # 保存结果
    black_white_path = f"{base_name}_mask_{data_category}.png"
    Image.fromarray(black_white_mask).save(black_white_path)
    print(f"类别[{data_category}]的黑白掩码已保存: {black_white_path}")

    # 画布重叠（掩码边缘叠加到原图）
    mask_image = Image.fromarray(black_white_mask)
    edge_overlay = overlay_mask_edges(
        original_image=original_image,
        mask_image=mask_image,
        edge_color=(0, 255, 0),  # 边缘颜色：绿色
        edge_thickness=2         # 边缘粗细
    )
    # 保存叠加结果
    overlay_path = f"{base_name}_edge_overlay_{data_category}.png"
    edge_overlay.save(overlay_path)
    print(f"边缘叠加图已保存: {overlay_path}")

    # 可视化
    plt.figure(figsize=(18, 6))
    plt.subplot(1, 3, 1)
    plt.imshow(original_image)
    plt.title("输入原图")
    plt.axis("off")
    plt.subplot(1, 3, 2)
    plt.imshow(black_white_mask, cmap="gray")
    plt.title("自适应掩码")
    plt.axis("off")
    plt.subplot(1, 3, 3)
    plt.imshow(edge_overlay)
    plt.title("原图+掩码边缘")
    plt.axis("off")
    plt.savefig(f"{base_name}_full_comparison_{data_category}.png", dpi=300)
    plt.show()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"程序异常：{e}")