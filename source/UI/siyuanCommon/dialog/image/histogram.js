import { 打开图片编辑器窗口 } from "../../../electronUI/windows/electronWindowManager.js"
export async function showHistogramDialog(result) {
    打开图片编辑器窗口(result.imagePath)
}
