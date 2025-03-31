export default class commonLoader{
    constructor(){

    }
    /***
     * 返回一个带有文件扩展名svg图标
     */
    async generateThumbnail(filePath, targetPath, error) {
        const extension = filePath.split('.').pop();
        const fileName = filePath.split('/').pop();
    
        // 如果是文件夹,生成文件夹图标
        if (extension === 'dir') {
            const svg = `
            <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#f5f5f5"/>
                <path d="M20,20 L80,20 L80,80 L20,80 Z" fill="#ffd700" stroke="#000" stroke-width="2"/>
                <path d="M20,20 L40,20 L40,40 L20,40 Z" fill="#ffd700" stroke="#000" stroke-width="2"/>
                <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#666">${fileName}</text>
            </svg>
            `;
            return {
                type: 'svg',
                data: svg
            }
        }
    
        // 如果是文件,生成文件图标
        const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#f5f5f5"/>
            <text x="50%" y="30%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="#666">${extension}</text>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#999">${fileName}</text>
            <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#ff4444">${error || '文件访问失败'}</text>
        </svg>
        `;
        return {
            type: 'svg',
            data: svg
        }
    }
}