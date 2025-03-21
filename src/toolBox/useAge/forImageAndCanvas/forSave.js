// 添加保存图片的辅助函数
export function saveImageData(imageData, fileName = 'mirrored_panorama.jpg') {
    // 创建临时 canvas 用于转换 ImageData 到 Blob
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    // 转换为 blob 并保存
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      // 触发下载
      document.body.appendChild(link);
      link.click();
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95); // 使用 95% 的质量
  } 