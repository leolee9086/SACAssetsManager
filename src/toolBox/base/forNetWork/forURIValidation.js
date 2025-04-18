/**
 * @fileoverview URI/URL 验证与清理工具
 * @module toolBox/base/forNetWork/forURIValidation
 */

/**
 * 检查字符串是否可能是有效的图片 src 属性值
 * 支持 http(s)://, data:image/, //, /path, ./path, ../path 等格式
 * @param {string} url - 要检查的字符串
 * @returns {boolean} 如果字符串可能是有效的 src 值，则返回 true
 */
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

    // 检查常见有效格式
    return (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:image/') ||
        url.startsWith('//') ||
        url.startsWith('/') ||
        url.startsWith('./') ||
        url.startsWith('../')
    );
}

/**
 * 对 URL 进行简单的安全清理检查
 * 只允许 http 和 https 协议，并检查常见的 XSS 相关模式。
 * 注意：这是一个基础检查，不能完全替代严格的 XSS 防护策略。
 * @param {string} url - 要清理和检查的 URL 字符串
 * @returns {string | null} 如果 URL 通过检查，返回原始 URL；否则返回 null
 */
export function sanitizeUrl(url) {
    if (typeof url !== 'string') {
        return null;
    }
    url = url.trim();
    if (url.length === 0) {
        return null;
    }

    // 允许的协议列表
    const allowedProtocols = ['http:', 'https:'];

    try {
        // 尝试解析 URL 以检查协议
        // 对于相对路径或协议相对 URL，直接允许（因为它们不含协议）
        let protocol = '';
        if (url.startsWith('//') || url.startsWith('/') || url.startsWith('.')) {
             // 相对路径或协议相对URL，跳过协议检查
        } else {
             const parsedUrl = new URL(url);
             protocol = parsedUrl.protocol;
             if (!allowedProtocols.includes(protocol)) {
                 console.warn(`URL 协议不允许: ${protocol} in ${url}`);
                 return null;
             }
        }

        // 检查常见的可能不安全的模式
        const unsafePatterns = [
            /javascript:/i,
            /data:(?!image\/)/i, // 允许 data:image/ 开头，禁止其他 data: 协议
            /vbscript:/i,
            /<script/i, // 检查 <script 开头
            /\s+on\w+=/i // 检查 onXXX= 事件处理器 (前面加空格以减少误判)
        ];

        for (const pattern of unsafePatterns) {
            if (pattern.test(url)) {
                console.warn(`URL 包含不安全模式 (${pattern}): ${url}`);
                return null;
            }
        }

        // 如果 URL 通过所有检查，则返回原始 URL
        return url;
    } catch (e) {
        // URL 解析失败（可能是格式错误或包含非法字符），视为无效
        // 但要允许相对路径通过
        if (url.startsWith('/') || url.startsWith('.')) {
           // 可能是有效的相对路径，再次检查不安全模式
           const unsafePatterns = [
                /javascript:/i,
                /data:(?!image\/)/i,
                /vbscript:/i,
                /<script/i,
                /\s+on\w+=/i
           ];
           for (const pattern of unsafePatterns) {
                if (pattern.test(url)) {
                    console.warn(`相对 URL 包含不安全模式 (${pattern}): ${url}`);
                    return null;
                }
           }
           return url; // 相对路径通过不安全模式检查
        }
        console.warn(`URL 解析失败或格式无效: ${url}`, e);
        return null;
    }
}

// 提供英文别名
export { isValidImageSrc as isPotentiallyValidImageSrc };
export { sanitizeUrl as computeSanitizedUrl }; 