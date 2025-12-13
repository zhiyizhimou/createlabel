import cv2
import numpy as np
from PIL import Image


def extract_mask_edges(mask_image, edge_threshold1=50, edge_threshold2=150):
    """
    从掩码图像中提取边缘
    
    参数:
        mask_image: PIL.Image对象，二值掩码图像（单通道）
        edge_threshold1: Canny边缘检测低阈值
        edge_threshold2: Canny边缘检测高阈值
        
    返回:
        numpy数组，边缘图像（单通道，边缘为255，背景为0）
    """
    # 转换为numpy数组
    mask_np = np.array(mask_image)
    
    # 确保掩码为单通道
    if len(mask_np.shape) == 3:
        mask_np = cv2.cvtColor(mask_np, cv2.COLOR_RGB2GRAY)
    
    # 二值化（确保掩码只有0和255）
    _, binary_mask = cv2.threshold(mask_np, 127, 255, cv2.THRESH_BINARY)
    
    # 提取边缘
    edges = cv2.Canny(binary_mask, edge_threshold1, edge_threshold2)
    return edges


def overlay_edges_on_image(original_image, edges, edge_color=(255, 0, 0), edge_thickness=2):
    """
    将边缘叠加到原始图像上
    
    参数:
        original_image: PIL.Image对象，原始图像（RGB格式）
        edges: numpy数组，从掩码提取的边缘图像
        edge_color: 边缘颜色，(R, G, B)格式
        edge_thickness: 边缘线粗细
        
    返回:
        PIL.Image对象，叠加边缘后的图像
    """
    # 转换原始图像为OpenCV格式（BGR）
    original_cv = cv2.cvtColor(np.array(original_image), cv2.COLOR_RGB2BGR)
    
    # 查找轮廓
    contours, _ = cv2.findContours(edges.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # 绘制轮廓（边缘）
    # 注意：OpenCV使用BGR格式，需要转换颜色通道
    bgr_color = (edge_color[2], edge_color[1], edge_color[0])
    cv2.drawContours(original_cv, contours, -1, bgr_color, edge_thickness)
    
    # 转换回PIL格式（RGB）
    result_image = Image.fromarray(cv2.cvtColor(original_cv, cv2.COLOR_BGR2RGB))
    return result_image


def overlay_mask_edges(original_image, mask_image, edge_color=(255, 0, 0), edge_thickness=2):
    """
    一站式处理：从掩码提取边缘并叠加到原始图像
    
    参数:
        original_image: PIL.Image对象，原始图像
        mask_image: PIL.Image对象，二值掩码图像
        edge_color: 边缘颜色(R, G, B)
        edge_thickness: 边缘粗细
        
    返回:
        PIL.Image对象，叠加边缘后的图像
    """
    edges = extract_mask_edges(mask_image)
    return overlay_edges_on_image(original_image, edges, edge_color, edge_thickness)