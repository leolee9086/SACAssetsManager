/**
 * 根据文本生成SVG头像
 * @param {string} text - 用于生成头像的文本（如模型名称）
 * @param {number} [size=200] - SVG尺寸
 * @param {string} [bgColor] - 背景颜色（可选），不提供时根据文本自动生成
 * @param {string} [textColor='#ffffff'] - 文本颜色
 * @param {number} [fontSize=80] - 字体大小
 * @return {string} 返回data URL形式的SVG图像
 */
export const generateTextAvatar = (text, size = 200, bgColor, textColor = '#ffffff', fontSize = 80) => {
  // 获取文本首字母（支持中英文）
  const firstChar = text.trim().charAt(0).toUpperCase()
  
  // 如果未提供背景色，根据文本生成一个固定的颜色
  const backgroundColor = bgColor || generateColorFromText(text)
  
  // 创建SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text 
        x="50%" 
        y="50%" 
        dy=".35em"
        fill="${textColor}" 
        font-size="${fontSize}" 
        font-family="Arial, Helvetica, sans-serif" 
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${firstChar}
      </text>
    </svg>
  `
  
  // 转换为data URL
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * 从文本生成固定的颜色
 * @param {string} text - 输入文本
 * @return {string} 十六进制颜色代码
 */
const generateColorFromText = (text) => {
  // 简单的哈希函数，将文本转换为数字
  const hashCode = text.split('')
    .reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0)
  
  // 使用哈希生成HSL色彩，保持饱和度和亮度，只改变色相
  // 使用0-360的色相值确保颜色多样性
  const hue = Math.abs(hashCode % 360)
  
  return `hsl(${hue}, 65%, 55%)`
}

/**
 * 创建带有错误处理的图片URL处理器
 * @param {string} originalSrc - 原始图片URL
 * @param {string} text - 用于生成备用头像的文本
 * @return {string} 处理后的URL或data URL
 */
export const getImageUrlWithFallback = (originalSrc, text) => {
  // 如果没有原始图片URL，直接生成SVG
  if (!originalSrc || originalSrc.trim() === '') {
    return generateTextAvatar(text)
  }
  
  return originalSrc
}

export default {
  generateTextAvatar,
  getImageUrlWithFallback,
}
