// 通用文件保存函数（支持任意Blob类型）
export function saveBlobFile(blob, fileName = 'file') {
    // 参数校验增强
    if (!(blob instanceof Blob)) {
        throw new Error('无效的Blob数据，请检查输入类型');
    }
    if (typeof fileName !== 'string' || fileName.trim() === '') {
        throw new Error('文件名必须为非空字符串');
    }

    // 统一处理不同浏览器的下载逻辑
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      // 保留原始错误堆栈信息
      throw new Error(`文件保存失败: ${error.message}`, { cause: error });
    }
  }
  