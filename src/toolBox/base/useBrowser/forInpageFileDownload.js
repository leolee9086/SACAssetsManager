/**
 * 将二进制数据保存为本地文件
 * @param {Blob} blob - 要保存的二进制数据，支持任意 Blob 类型（包括 File、Blob、ArrayBuffer 等）
 * @param {string} [fileName='file'] - 保存时使用的文件名
 * @throws {Error} 当 blob 参数不是有效的 Blob 对象时抛出错误
 * @throws {Error} 当 fileName 不是有效的字符串时抛出错误
 * @throws {Error} 当文件保存过程中发生错误时抛出错误
 * @example
 * // 保存文本文件
 * const textBlob = new Blob(['Hello World'], { type: 'text/plain' });
 * 保存二进制文件(textBlob, 'hello.txt');
 * 
 * // 保存图片文件
 * const response = await fetch('image.png');
 * const imageBlob = await response.blob();
 * 保存二进制文件(imageBlob, 'image.png');
 */
export function 保存二进制文件(blob, fileName = 'file') {
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
  