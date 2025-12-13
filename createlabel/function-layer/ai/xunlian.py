import os
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import matplotlib.pyplot as plt
import glob
import random
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from tqdm import tqdm

# 设置随机种子
seed = 42
random.seed(seed)
np.random.seed(seed)
torch.manual_seed(seed)
if torch.cuda.is_available():
    torch.cuda.manual_seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# -------------------------- 1. 数据增强 --------------------------
class EnhancedAugmentation:
    @staticmethod
    def strong_augment(image, mask):
        scale = random.uniform(0.8, 1.2)
        w, h = image.size
        image = transforms.functional.resize(image, (int(h*scale), int(w*scale)))
        mask = transforms.functional.resize(mask, (int(h*scale), int(w*scale)))
        
        crop_size = 256
        if image.size[0] > crop_size and image.size[1] > crop_size:
            i, j, h_crop, w_crop = transforms.RandomCrop.get_params(
                image, output_size=(crop_size, crop_size)
            )
            image = transforms.functional.crop(image, i, j, h_crop, w_crop)
            mask = transforms.functional.crop(mask, i, j, h_crop, w_crop)
        else:
            image = transforms.functional.resize(image, (crop_size, crop_size))
            mask = transforms.functional.resize(mask, (crop_size, crop_size))
        
        if random.random() > 0.5:
            image = transforms.functional.hflip(image)
            mask = transforms.functional.hflip(mask)
        if random.random() > 0.5:
            image = transforms.functional.vflip(image)
            mask = transforms.functional.vflip(mask)
        
        angle = random.uniform(-30, 30)
        image = transforms.functional.rotate(image, angle)
        mask = transforms.functional.rotate(mask, angle)
        
        if random.random() > 0.5:
            brightness = random.uniform(0.6, 1.4)
            contrast = random.uniform(0.6, 1.4)
            saturation = random.uniform(0.6, 1.4)
            image = transforms.functional.adjust_brightness(image, brightness)
            image = transforms.functional.adjust_contrast(image, contrast)
            image = transforms.functional.adjust_saturation(image, saturation)
        
        if random.random() > 0.7:
            img_np = np.array(image) / 255.0
            noise = np.random.normal(0, 0.03, img_np.shape)
            img_np = np.clip(img_np + noise, 0, 1)
            image = Image.fromarray((img_np * 255).astype(np.uint8))
        
        return image, mask


# -------------------------- 2. 数据集定义 --------------------------
class SmallDataset(Dataset):
    def __init__(self, image_paths, mask_paths, img_size=256, augment=True):
        self.image_paths = image_paths
        self.mask_paths = mask_paths
        self.img_size = img_size
        self.augment = augment
        self.enhancer = EnhancedAugmentation()
        
        self.img_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        self.mask_transform = transforms.Compose([
            transforms.ToTensor()
        ])

    def __len__(self):
        return len(self.image_paths) * 3 if self.augment else len(self.image_paths)

    def __getitem__(self, idx):
        idx = idx % len(self.image_paths)
        image = Image.open(self.image_paths[idx]).convert('RGB')
        mask = Image.open(self.mask_paths[idx]).convert('L')
        
        if self.augment:
            image, mask = self.enhancer.strong_augment(image, mask)
        
        image = self.img_transform(image)
        mask = self.mask_transform(mask)
        mask = (mask > 0.5).float()
        return image, mask


# -------------------------- 3. 模型定义（修正尺寸不匹配问题） --------------------------
class UNetPlusPlus(nn.Module):
    def __init__(self, in_channels=3, out_channels=1):
        super().__init__()
        # 编码器
        self.enc1 = self.double_conv(in_channels, 64)
        self.enc2 = self.double_conv(64, 128)
        self.enc3 = self.double_conv(128, 256)
        self.enc4 = self.double_conv(256, 512)
        
        # 瓶颈
        self.bottleneck = self.double_conv(512, 1024)
        
        # 解码器
        self.up4 = self.up_conv(1024, 512)
        self.dec4 = self.double_conv(1024, 512)
        
        self.up3 = self.up_conv(512, 256)
        self.dec3 = self.double_conv(512, 256)
        
        self.up2 = self.up_conv(256, 128)
        self.dec2 = self.double_conv(256, 128)
        
        self.up1 = self.up_conv(128, 64)
        self.dec1 = self.double_conv(128, 64)
        
        # 输出层
        self.outc = nn.Conv2d(64, out_channels, kernel_size=1)
        
        # 注意力模块
        self.attention = nn.Sequential(
            nn.Conv2d(64, 1, kernel_size=1),
            nn.Sigmoid()
        )

    def double_conv(self, in_channels, out_channels):
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def up_conv(self, in_channels, out_channels):
        return nn.ConvTranspose2d(in_channels, out_channels, kernel_size=2, stride=2)

    def forward(self, x):
        # 编码器输出
        e1 = self.enc1(x)                   # 尺寸: [B, 64, H, W]
        e2 = self.enc2(nn.MaxPool2d(2)(e1)) # [B, 128, H/2, W/2]
        e3 = self.enc3(nn.MaxPool2d(2)(e2)) # [B, 256, H/4, W/4]
        e4 = self.enc4(nn.MaxPool2d(2)(e3)) # [B, 512, H/8, W/8]
        
        # 瓶颈
        b = self.bottleneck(nn.MaxPool2d(2)(e4)) # [B, 1024, H/16, W/16]
        
        # 解码器（关键：每次拼接前对齐尺寸）
        d4 = self.up4(b)  # [B, 512, H/8, W/8]
        # 对齐d4和e4的尺寸（H和W）
        d4 = self.pad_to_match(d4, e4)
        d4 = torch.cat([d4, e4], dim=1)  # 拼接通道维度
        d4 = self.dec4(d4)
        
        d3 = self.up3(d4)  # [B, 256, H/4, W/4]
        d3 = self.pad_to_match(d3, e3)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.dec3(d3)
        
        d2 = self.up2(d3)  # [B, 128, H/2, W/2]
        d2 = self.pad_to_match(d2, e2)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.dec2(d2)
        
        d1 = self.up1(d2)  # [B, 64, H, W]
        d1 = self.pad_to_match(d1, e1)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.dec1(d1)
        
        # 注意力输出
        out = self.outc(d1)
        attn = self.attention(d1)
        return out * attn

    def pad_to_match(self, x, target):
        """将x的尺寸padding到与target一致（处理H和W的差异）"""
        x_h, x_w = x.shape[2], x.shape[3]
        t_h, t_w = target.shape[2], target.shape[3]
        
        # 计算需要填充的像素数（上下左右）
        pad_h = max(0, t_h - x_h)
        pad_w = max(0, t_w - x_w)
        pad_top = pad_h // 2
        pad_bottom = pad_h - pad_top
        pad_left = pad_w // 2
        pad_right = pad_w - pad_left
        
        # 填充x使其与target尺寸一致
        return torch.nn.functional.pad(
            x, (pad_left, pad_right, pad_top, pad_bottom), mode='constant', value=0
        )


# -------------------------- 4. 损失函数 --------------------------
class FocalDiceLoss(nn.Module):
    def __init__(self, alpha=0.8, gamma=2.0, smooth=1e-5):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.smooth = smooth

    def forward(self, inputs, targets):
        inputs_sigmoid = torch.sigmoid(inputs)
        
        # Focal Loss
        bce = nn.BCELoss(reduction='none')(inputs_sigmoid, targets)
        pt = torch.exp(-bce)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * bce
        focal_loss = focal_loss.mean()
        
        # Dice Loss
        intersection = (inputs_sigmoid * targets).sum()
        dice_loss = 1 - (2. * intersection + self.smooth) / (
            inputs_sigmoid.sum() + targets.sum() + self.smooth
        )
        
        return 0.3 * focal_loss + 0.7 * dice_loss


# -------------------------- 5. 推理函数 --------------------------
def optimized_infer(image_path, model, device, img_size=256, threshold=None):
    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    img_np = np.array(image)
    
    patch_size = 512
    overlap = 128
    pred_mask = np.zeros((h, w), dtype=np.float32)
    count = np.ones((h, w), dtype=np.float32)
    
    model.eval()
    with torch.no_grad():
        for y in tqdm(range(0, h, patch_size - overlap), desc="推理中"):
            for x in range(0, w, patch_size - overlap):
                y_end = min(y + patch_size, h)
                x_end = min(x + patch_size, w)
                y_start = max(0, y_end - patch_size)
                x_start = max(0, x_end - patch_size)
                
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
    
    if threshold is None:
        mean = pred_mask.mean()
        std = pred_mask.std()
        threshold = max(0.2, min(mean + 0.6 * std, 0.7))
        print(f"自动计算阈值: {threshold:.2f}")
    
    binary_mask = (pred_mask > threshold).astype(np.uint8) * 255
    kernel = np.ones((2, 2), np.uint8)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    
    return Image.fromarray(binary_mask), threshold


# -------------------------- 6. 训练函数 --------------------------
def train(model, train_loader, val_loader, criterion, optimizer, scheduler, 
          device, epochs=50, patience=10):
    best_dice = 0.0
    early_stop_cnt = 0
    train_log = {'loss': [], 'dice': []}
    val_log = {'loss': [], 'dice': []}
    
    for epoch in range(epochs):
        model.train()
        train_loss, train_dice = 0.0, 0.0
        
        for images, masks in tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}"):
            images, masks = images.to(device), masks.to(device)
            optimizer.zero_grad()
            
            outputs = model(images)
            loss = criterion(outputs, masks)
            
            # 计算Dice
            preds = torch.sigmoid(outputs) > 0.5
            intersection = (preds.float() * masks).sum()
            union = preds.sum() + masks.sum()
            dice = (2. * intersection) / (union + 1e-8) if union > 0 else 0.0
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            train_dice += dice.item() * images.size(0)
        
        # 验证
        model.eval()
        val_loss, val_dice = 0.0, 0.0
        with torch.no_grad():
            for images, masks in val_loader:
                images, masks = images.to(device), masks.to(device)
                outputs = model(images)
                loss = criterion(outputs, masks)
                
                preds = torch.sigmoid(outputs) > 0.5
                intersection = (preds.float() * masks).sum()
                union = preds.sum() + masks.sum()
                dice = (2. * intersection) / (union + 1e-8) if union > 0 else 0.0
                
                val_loss += loss.item() * images.size(0)
                val_dice += dice.item() * images.size(0)
        
        # 计算平均指标
        train_loss /= len(train_loader.dataset)
        train_dice /= len(train_loader.dataset)
        val_loss /= len(val_loader.dataset)
        val_dice /= len(val_loader.dataset)
        
        # 记录日志
        train_log['loss'].append(train_loss)
        train_log['dice'].append(train_dice)
        val_log['loss'].append(val_loss)
        val_log['dice'].append(val_dice)
        
        # 学习率调度
        scheduler.step()
        
        print(f"\nEpoch {epoch+1} | "
              f"Train Loss: {train_loss:.4f}, Train Dice: {train_dice:.4f} | "
              f"Val Loss: {val_loss:.4f}, Val Dice: {val_dice:.4f}")
        
        # 保存最佳模型
        if val_dice > best_dice + 1e-4:
            best_dice = val_dice
            torch.save(model.state_dict(), "best_model_optimized.pth")
            print(f"保存最佳模型 (Val Dice: {best_dice:.4f})")
            early_stop_cnt = 0
        else:
            early_stop_cnt += 1
            if early_stop_cnt >= patience:
                print("早停触发，停止训练")
                break
    
    # 绘制训练曲线
    plt.figure(figsize=(12, 4))
    plt.subplot(121)
    plt.plot(train_log['loss'], label='Train')
    plt.plot(val_log['loss'], label='Val')
    plt.title('Loss')
    plt.legend()
    plt.subplot(122)
    plt.plot(train_log['dice'], label='Train')
    plt.plot(val_log['dice'], label='Val')
    plt.title('Dice')
    plt.legend()
    plt.savefig('training_curves_optimized.png')
    plt.close()
    
    return model


# -------------------------- 7. 主函数 --------------------------
def main():
    # 数据路径（替换为你的实际路径）
    train_img_dir = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/training/images"
    train_mask_dir = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/training/manual"
    val_img_dir = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/test/images"
    val_mask_dir = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/test/manual"
    
    # 获取路径列表
    train_img_paths = sorted(glob.glob(os.path.join(train_img_dir, "*.*")))
    train_mask_paths = sorted(glob.glob(os.path.join(train_mask_dir, "*.*")))
    val_img_paths = sorted(glob.glob(os.path.join(val_img_dir, "*.*")))
    val_mask_paths = sorted(glob.glob(os.path.join(val_mask_dir, "*.*")))
    
    # 检查数据
    assert len(train_img_paths) == len(train_mask_paths), "训练集数据不匹配"
    assert len(val_img_paths) == len(val_mask_paths), "验证集数据不匹配"
    print(f"训练集: {len(train_img_paths)} 样本 | 验证集: {len(val_img_paths)} 样本")
    
    # 数据集与加载器
    batch_size = 4
    train_dataset = SmallDataset(train_img_paths, train_mask_paths, augment=True)
    val_dataset = SmallDataset(val_img_paths, val_mask_paths, augment=False)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2)
    
    # 设备
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"使用设备: {device}")
    
    # 模型初始化
    model = UNetPlusPlus(in_channels=3, out_channels=1).to(device)
    
    # 优化器与调度器
    optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)
    scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2, eta_min=1e-6)
    
    # 训练
    print("开始训练...")
    model = train(
        model, train_loader, val_loader,
        criterion=FocalDiceLoss(),
        optimizer=optimizer,
        scheduler=scheduler,
        device=device,
        epochs=50,
        patience=10
    )
    
    # 加载最佳模型
    model.load_state_dict(torch.load("best_model_optimized.pth", map_location=device))
    
    # 推理示例
    test_img_path = "C:/Users/上杉初绘/Desktop/app/dachuang/MoNuSeg/test/images/TCGA-2Z-A9J9-01A-01-TS1.tif"
    pred_mask, threshold = optimized_infer(test_img_path, model, device)
    
    # 保存结果
    pred_mask.save("optimized_mask.png")
    print(f"优化后的掩码已保存至: optimized_mask.png (使用阈值: {threshold:.2f})")
    
    # 可视化对比
    original = Image.open(test_img_path).convert("RGB")
    plt.figure(figsize=(12, 6))
    plt.subplot(121)
    plt.imshow(original)
    plt.title("原图")
    plt.axis("off")
    plt.subplot(122)
    plt.imshow(pred_mask, cmap="gray")
    plt.title("优化后掩码")
    plt.axis("off")
    plt.savefig("comparison_optimized.png")
    plt.show()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"运行出错: {e}")