export async function 创建简单短哈希(文本,短码长度=8) {
    const 编码器 = new TextEncoder();
    const 编码结果 = 编码器.encode(文本);
    const hashBuffer = await crypto.subtle.digest('SHA-256', 编码结果);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const 哈希值 = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    const 短哈希值 = 哈希值.substring(0, 短码长度);
    return 短哈希值;
}
