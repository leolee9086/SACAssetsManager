/**
 * 这里的思源工作空间一般我是直接以fs的命名导入
 * 但是这个插件有大量用到fs模块的地方,所以直接使用思源工作空间了
 * 名字长一点不容易搞混
 * 使用iframe进行解析,是因为在实际使用中发现好像使用iframe是最流畅的
 * 可能跟不同资源的加载过程有关
 */
import * as 思源工作空间文件适配器 from '../../polyfills/fs.js'
let imageHtmlContent
export function 创建思源附件预览页面内容(asset,raw) {
    const HtmlContent = imageHtmlContent || 思源工作空间文件适配器.readFileSync(`/data/plugins/SACAssetsManager/source/previewers/common.html`)
    imageHtmlContent = HtmlContent
    // return imageHtmlContent
    const encodedHtmlContent = encodeURIComponent(imageHtmlContent);
    return !raw?`data:text/html;charset=utf-8,${encodedHtmlContent}`:imageHtmlContent;
}
