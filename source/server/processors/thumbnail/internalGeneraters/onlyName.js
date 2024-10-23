export default class commonLoader{
    constructor(){

    }
    /***
     * 返回一个带有文件扩展名svg图标
     */
    async generateThumbnail(filePath, targetPath, error) {
        const extension = filePath.split('.').pop();
    
        // 创建一个SVG模板，显示文件扩展名和错误信息
        const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="#000">${extension}</text>
            <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="red">${error}</text>
        </svg>
        `;
        return {
            type: 'svg',
            data: svg
        }
    }
}