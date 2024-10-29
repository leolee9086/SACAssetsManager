export function isValidImageSrc(url) {
    // 检查是否是字符串
    if (typeof url !== 'string') {
        return false;
    }

    // 去除前后空格
    url = url.trim();

    // 检查是否为空字符串
    if (url.length === 0) {
        return false;
    }

    // 检查是否是以 http:// 或 https:// 开头
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return true;
    }

    // 检查是否是以 data:image/ 开头（用于 base64 编码的图片）
    if (url.startsWith('data:image/')) {
        return true;
    }

    // 检查是否是以 // 开头（协议相对 URL）
    if (url.startsWith('//')) {
        return true;
    }

    // 检查是否是相对路径或绝对路径（以 / 开头）
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return true;
    }

    // 如果以上条件都不满足，则认为不是有效的图片 src
    return false;
}
export function sanitizeUrl(url) {
    // 允许的协议列表
    const allowedProtocols = ['http:', 'https:'];

    try {
        // 创建一个URL对象以便于解析
        const parsedUrl = new URL(url);

        // 检查协议是否在允许的列表中
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
            return null;
        }

        // 检查URL中是否包含不安全的字符或模式
        const unsafePatterns = [
            /javascript:/i, // 禁止javascript协议
            /data:/i,       // 禁止data协议
            /vbscript:/i,   // 禁止vbscript协议
            /<script>/i,    // 禁止script标签
            /on\w+=/i       // 禁止事件处理程序
        ];

        for (const pattern of unsafePatterns) {
            if (pattern.test(url)) {
                return null;
            }
        }

        // 如果URL通过所有检查，则返回原始URL
        return url;
    } catch (e) {
        // 如果URL解析失败，返回null
        return null;
    }
}