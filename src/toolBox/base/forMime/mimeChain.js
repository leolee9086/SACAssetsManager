import { 创建串链器 } from '../forCore/串链器.js';
import useMime from '../../../src/utils/base/useMime.js';

/**
 * MIME 类型串链器
 * 提供链式操作 MIME 类型的 API
 * 
 * 使用示例:
 * ```
 * // 检查文件类型
 * const 是图片 = MIME链('image/jpeg').是否图片类型().值;
 * 
 * // 获取扩展名
 * const 扩展名列表 = MIME链('text/html').获取扩展名列表().值;
 * 
 * // 链式操作
 * const 结果 = MIME链('example.jpg')
 *   .根据完整文件名获取Mime类型()
 *   .是否图片类型()
 *   .分支([
 *     [值 => 值 === true, 值 => '这是图片文件'],
 *     [值 => 值 === false, 值 => '这不是图片文件']
 *   ])
 *   .值;
 * ```
 */

// 创建 MIME 串链器
const MIME链 = 创建串链器();

// 注册基础 MIME 操作
MIME链.根据Mime类型获取扩展名列表(
  值 => useMime.根据Mime类型获取扩展名列表(值)
);

MIME链.根据完整文件名获取Mime类型(
  值 => useMime.根据完整文件名获取Mime类型(值)
);

// 注册类型检查操作
MIME链.是否为类别(
  (值, 类别) => useMime.是否为类别(值, 类别),
  (值, 类别) => typeof 类别 === 'string'
);

MIME链.是否文本类型(
  值 => useMime.是否文本类型(值)
);

MIME链.是否图片类型(
  值 => useMime.是否图片类型(值)
);

MIME链.是否音频类型(
  值 => useMime.是否音频类型(值)
);

MIME链.是否视频类型(
  值 => useMime.是否视频类型(值)
);

// 注册文件类型检查操作
MIME链.是否文本文件(
  值 => useMime.是否文本文件(值)
);

MIME链.是否图片文件(
  值 => useMime.是否图片文件(值)
);

MIME链.是否音频文件(
  值 => useMime.是否音频文件(值)
);

MIME链.是否视频文件(
  值 => useMime.是否视频文件(值)
);

// 注册高级 MIME 操作
MIME链.是否可压缩(
  值 => useMime.是否可压缩(值)
);

MIME链.获取字符集(
  值 => useMime.获取字符集(值)
);

MIME链.获取文件分类(
  值 => useMime.获取文件分类(值)
);

MIME链.获取文件图标(
  值 => useMime.获取文件图标(值)
);

MIME链.检测文件类型(
  值 => useMime.检测文件类型(值)
);

MIME链.验证文件类型(
  (文件名, 文件数据) => useMime.验证文件类型(文件名, 文件数据),
  (文件名, 文件数据) => typeof 文件名 === 'string' && 
    (文件数据 instanceof ArrayBuffer || 文件数据 instanceof Uint8Array)
);

MIME链.获取HTTP头部(
  值 => useMime.获取HTTP头部(值)
);

MIME链.获取缓存策略(
  值 => useMime.获取缓存策略(值)
);

MIME链.获取MIME用途(
  值 => useMime.获取MIME用途(值)
);

MIME链.获取推荐操作(
  值 => useMime.获取推荐操作(值)
);

MIME链.获取MIME安全等级(
  值 => useMime.获取MIME安全等级(值)
);

// 注册便捷组合操作
MIME链.获取文件信息(
  值 => {
    const mime类型 = 值.includes('/') ? 值 : useMime.根据完整文件名获取Mime类型(值);
    if (!mime类型) return { 类型: '未知', 分类: '未知', 图标: '❓' };
    
    return {
      类型: mime类型,
      分类: useMime.获取文件分类(mime类型),
      图标: useMime.获取文件图标(mime类型),
      扩展名: useMime.根据Mime类型获取扩展名列表(mime类型),
      字符集: useMime.获取字符集(mime类型),
      可压缩: useMime.是否可压缩(mime类型),
      安全等级: useMime.获取MIME安全等级(mime类型),
      用途: useMime.获取MIME用途(mime类型)
    };
  }
);

// 注册文件类型转换操作
MIME链.转换为安全类型(
  值 => {
    const mime类型 = 值.includes('/') ? 值 : useMime.根据完整文件名获取Mime类型(值);
    if (!mime类型) return 'application/octet-stream';
    
    const 安全等级 = useMime.获取MIME安全等级(mime类型);
    if (安全等级 === '高风险') return 'application/octet-stream';
    return mime类型;
  }
);

// 注册命名空间
MIME链.命名空间('检查');

MIME链.$检查$.是文本(
  值 => useMime.是否文本类型(值) || useMime.是否文本文件(值)
);

MIME链.$检查$.是图片(
  值 => useMime.是否图片类型(值) || useMime.是否图片文件(值)
);

MIME链.$检查$.是音频(
  值 => useMime.是否音频类型(值) || useMime.是否音频文件(值)
);

MIME链.$检查$.是视频(
  值 => useMime.是否视频类型(值) || useMime.是否视频文件(值)
);

MIME链.$检查$.是安全的(
  值 => {
    const mime类型 = 值.includes('/') ? 值 : useMime.根据完整文件名获取Mime类型(值);
    if (!mime类型) return false;
    return useMime.获取MIME安全等级(mime类型) !== '高风险';
  }
);

export default MIME链;