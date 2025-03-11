import mimeDb from '../../../static/mimeDb.js';
import { 获取MIME用途 } from './forMimeUsage.js';

/**
 * mime工具库
 */
const useMime = {
  /**
   * 根据 MIME 类型获取对应的文件扩展名列表
   * @param {string} mime类型 - MIME 类型
   * @returns {string[]} 文件扩展名数组
   */
  根据Mime类型获取扩展名列表(mime类型) {
    if (!mime类型) return [];
    return mimeDb[mime类型]?.extensions || [];
  },

  /**
   * 根据文件扩展名获取MIME类型
   * @param {string} 扩展名 - 文件扩展名
   * @returns {string|null} MIME类型
   */
  根据扩展名获取Mime类型(扩展名) {
    if (!扩展名) return null;
    扩展名 = 扩展名.toLowerCase().replace(/^\./, '');
    
    for (const mime in mimeDb) {
      const info = mimeDb[mime];
      if (info.extensions && info.extensions.includes(扩展名)) {
        return mime;
      }
    }
    return null;
  },
  根据完整文件名获取Mime类型(完整文件名) {
    const 扩展名 = 完整文件名.split('.').pop();
    return this.根据扩展名获取Mime类型(扩展名);
  },
  /**
   * 检查MIME类型是否为指定类别
   * @param {string} mime类型 - MIME类型
   * @param {string} 类别 - 检查的类别(text/image/audio/video等)
   * @returns {boolean} 
   */
  是否为类别(mime类型, 类别) {
    if (!mime类型) return false;
    return mime类型.startsWith(`${类别}/`);
  },

  /**
   * 检查是否为文本类型的 MIME
   * @param {string} mime类型 - MIME 类型
   * @returns {boolean} 如果是文本类型返回 true
   */
  是否文本类型(mime类型) {
    return this.是否为类别(mime类型, 'text');
  },

  /**
   * 检查是否为图片类型的 MIME
   * @param {string} mime类型 - MIME 类型
   * @returns {boolean} 如果是图片类型返回 true
   */
  是否图片类型(mime类型) {
    console.log(mime类型);
    return this.是否为类别(mime类型, 'image');
  },

  /**
   * 检查是否为音频类型的 MIME
   * @param {string} mime类型 - MIME 类型
   * @returns {boolean} 如果是音频类型返回 true
   */
  是否音频类型(mime类型) {
    return this.是否为类别(mime类型, 'audio');
  },

  /**
   * 检查是否为视频类型的 MIME
   * @param {string} mime类型 - MIME 类型
   * @returns {boolean} 如果是视频类型返回 true
   */
  是否视频类型(mime类型) {
    return this.是否为类别(mime类型, 'video');
  },

  /**
   * 根据文件扩展名检查文件类型
   * @param {string} 扩展名 - 文件扩展名
   * @param {Function} 类型检查函数 - MIME类型检查函数
   * @returns {boolean}
   */
  检查文件类型(扩展名, 类型检查函数) {
    const mime类型 = this.根据完整文件名获取Mime类型(扩展名);
    console.log(mime类型);
    return mime类型 && 类型检查函数.call(this, mime类型);
  },

  /**
   * 根据文件扩展名检查是否为文本文件
   * @param {string} 扩展名 - 文件扩展名
   * @returns {boolean} 如果是文本文件返回 true
   */
  是否文本文件(扩展名) {
    return this.检查文件类型(扩展名, this.是否文本类型);
  },

  /**
   * 根据文件扩展名检查是否为图片文件
   * @param {string} 扩展名 - 文件扩展名
   * @returns {boolean} 如果是图片文件返回 true
   */
  是否图片文件(扩展名) {
    console.log(扩展名);
    return this.检查文件类型(扩展名, this.是否图片类型);
  },

  /**
   * 根据文件扩展名检查是否为音频文件
   * @param {string} 扩展名 - 文件扩展名
   * @returns {boolean} 如果是音频文件返回 true
   */
  是否音频文件(扩展名) {
    return this.检查文件类型(扩展名, this.是否音频类型);
  },

  /**
   * 根据文件扩展名检查是否为视频文件
   * @param {string} 扩展名 - 文件扩展名
   * @returns {boolean} 如果是视频文件返回 true
   */
  是否视频文件(扩展名) {
    return this.检查文件类型(扩展名, this.是否视频类型);
  },

  /**
   * 检查MIME类型是否可压缩
   * @param {string} mime类型 - MIME类型
   * @returns {boolean}
   */
  是否可压缩(mime类型) {
    if (!mime类型) return false;
    return mimeDb[mime类型]?.compressible || false;
  },

  /**
   * 获取MIME类型的字符集
   * @param {string} mime类型 - MIME类型
   * @returns {string|null} 字符集
   */
  获取字符集(mime类型) {
    if (!mime类型) return null;
    return mimeDb[mime类型]?.charset || null;
  },

  /**
   * 获取文件类型的分类
   * @param {string} 文件名或mime类型 - 文件名或MIME类型
   * @returns {string} 分类名称
   */
  获取文件分类(文件名或mime类型) {
    const mime类型 = 文件名或mime类型.includes('/') ? 
      文件名或mime类型 : 
      this.获取Mime类型(文件名或mime类型);

    if (!mime类型) return '未知';
    
    if (this.是否文本类型(mime类型)) return '文本';
    if (this.是否图片类型(mime类型)) return '图片';
    if (this.是否音频类型(mime类型)) return '音频';
    if (this.是否视频类型(mime类型)) return '视频';
    
    return '其他';
  },

  /**
   * 获取常见文件类型的图标
   * @param {string} 文件名或mime类型 - 文件名或MIME类型
   * @returns {string} 图标
   */
  获取文件图标(文件名或mime类型) {
    const 分类 = this.获取文件分类(文件名或mime类型);
    const 图标映射 = {
      '文本': '📄',
      '图片': '🖼️',
      '音频': '🎵',
      '视频': '🎥',
      '其他': '📁',
      '未知': '❓'
    };
    return 图标映射[分类];
  },

  /**
   * 根据文件内容判断实际MIME类型
   * @param {ArrayBuffer|Uint8Array} 文件数据 - 文件的二进制数据
   * @returns {string|null} 检测到的MIME类型
   */
  检测文件类型(文件数据) {
    // 常见文件头部特征
    const 特征映射 = [
      { 特征: [0xFF, 0xD8, 0xFF], mime类型: 'image/jpeg' },
      { 特征: [0x89, 0x50, 0x4E, 0x47], mime类型: 'image/png' },
      { 特征: [0x47, 0x49, 0x46, 0x38], mime类型: 'image/gif' },
      { 特征: [0x25, 0x50, 0x44, 0x46], mime类型: 'application/pdf' },
      { 特征: [0x50, 0x4B, 0x03, 0x04], mime类型: 'application/zip' },
      { 特征: [0x52, 0x61, 0x72, 0x21], mime类型: 'application/x-rar-compressed' },
      { 特征: [0x1F, 0x8B], mime类型: 'application/gzip' },
      { 特征: [0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D], mime类型: 'video/mp4' },
      { 特征: [0x49, 0x44, 0x33], mime类型: 'audio/mpeg' },
      { 特征: [0x42, 0x4D], mime类型: 'image/bmp' },
    ];

    // 转换为Uint8Array以便统一处理
    const 数据 = 文件数据 instanceof ArrayBuffer ? new Uint8Array(文件数据) : 文件数据;
    
    for (const { 特征, mime类型 } of 特征映射) {
      let 匹配 = true;
      for (let i = 0; i < 特征.length; i++) {
        if (数据[i] !== 特征[i]) {
          匹配 = false;
          break;
        }
      }
      if (匹配) return mime类型;
    }
    
    // 检测文本文件
    const 是否可能为文本 = !数据.some(字节 => (字节 < 9 && 字节 !== 0) || (字节 > 126 && 字节 < 160));
    if (是否可能为文本) return 'text/plain';
    
    return null;
  },

  /**
   * 验证文件扩展名与实际内容是否匹配
   * @param {string} 文件名 - 文件名
   * @param {ArrayBuffer|Uint8Array} 文件数据 - 文件的二进制数据
   * @returns {boolean} 是否匹配
   */
  验证文件类型(文件名, 文件数据) {
    const 扩展名 = 文件名.split('.').pop().toLowerCase();
    const 声明的类型 = this.获取Mime类型(扩展名);
    const 实际类型 = this.检测文件类型(文件数据);
    
    if (!声明的类型 || !实际类型) return false;
    
    // 检查主类型是否匹配(如image/jpeg和image/png都是image类型)
    const 声明的主类型 = 声明的类型.split('/')[0];
    const 实际主类型 = 实际类型.split('/')[0];
    
    return 声明的主类型 === 实际主类型;
  },

  /**
   * 获取MIME类型对应的HTTP头部
   * @param {string} mime类型 - MIME类型
   * @returns {Object} HTTP头部对象
   */
  获取HTTP头部(mime类型) {
    if (!mime类型) return {};
    
    const 头部 = {
      'Content-Type': mime类型
    };
    
    const 字符集 = this.获取字符集(mime类型);
    if (字符集) {
      头部['Content-Type'] += `; charset=${字符集}`;
    }
    
    if (this.是否可压缩(mime类型)) {
      头部['Content-Encoding'] = 'gzip';
    }
    
    return 头部;
  },

  /**
   * 获取文件的推荐缓存策略
   * @param {string} 文件名或mime类型 - 文件名或MIME类型
   * @returns {Object} 缓存策略对象
   */
  获取缓存策略(文件名或mime类型) {
    const mime类型 = 文件名或mime类型.includes('/') ? 
      文件名或mime类型 : 
      this.获取Mime类型(文件名或mime类型.split('.').pop());
    
    if (!mime类型) return { 'Cache-Control': 'no-store' };
    
    // 静态资源通常可以长时间缓存
    if (this.是否图片类型(mime类型) || mime类型.includes('font') || 
        mime类型.includes('javascript') || mime类型.includes('css')) {
      return { 
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      };
    }
    
    // HTML和JSON等动态内容通常不应长时间缓存
    if (mime类型.includes('html') || mime类型.includes('json')) {
      return { 'Cache-Control': 'no-cache' };
    }
    
    // 默认缓存策略
    return { 'Cache-Control': 'public, max-age=86400' };
  },

  /**
   * 获取MIME类型的常见用途
   * @param {string} mime类型 - MIME类型
   * @returns {string[]} 常见用途
   */
  获取MIME用途,

  /**
   * 根据MIME类型获取推荐的文件操作
   * @param {string} mime类型 - MIME类型
   * @returns {Object} 推荐操作对象
   */
  获取推荐操作(mime类型) {
    if (!mime类型) return {};
    
    const 基本操作 = {
      查看: true,
      下载: true
    };
    
    // 根据MIME类型添加特定操作
    if (this.是否图片类型(mime类型)) {
      return {
        ...基本操作,
        编辑: true,
        旋转: true,
        裁剪: true,
        设为壁纸: true
      };
    }
    
    if (this.是否音频类型(mime类型)) {
      return {
        ...基本操作,
        播放: true,
        添加到播放列表: true,
        设为铃声: true
      };
    }
    
    if (this.是否视频类型(mime类型)) {
      return {
        ...基本操作,
        播放: true,
        提取音频: true,
        截取画面: true
      };
    }
    
    if (this.是否文本类型(mime类型)) {
      return {
        ...基本操作,
        编辑: true,
        复制内容: true,
        打印: true
      };
    }
    
    return 基本操作;
  },

  /**
   * 获取MIME类型的安全等级
   * @param {string} mime类型 - MIME类型
   * @returns {string} 安全等级
   */
  获取MIME安全等级(mime类型) {
    if (!mime类型) return '未知';
    
    const 高风险类型 = [
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-msi',
      'application/x-javascript',
      'application/x-sh',
      'application/x-csh'
    ];
    
    const 中风险类型 = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-tar',
      'application/x-gzip',
      'application/java-archive'
    ];
    
    if (高风险类型.includes(mime类型) || mime类型.includes('executable')) {
      return '高风险';
    }
    
    if (中风险类型.includes(mime类型)) {
      return '中风险';
    }
    
    return '低风险';
  }
};

export default useMime;