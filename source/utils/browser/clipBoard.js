import { isValidFilePath } from "../strings/regexs/index.js";
export async function checkClipboardForFilePath() {
    try {
        const text = await navigator.clipboard.readText();
        // 将剪贴板内容按行分割
        const lines = text.split('\n').map(item=>item.trim());
        // 对每一行进行路径验证，并返回有效路径的数组
        const validPaths = lines.map(line => isValidFilePath(line)).filter(item=>item);
        return validPaths;
    } catch (error) {
        console.error("无法读取剪贴板内容:", error);
    }
}