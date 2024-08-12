export default class commonLoader{
    constructor(){

    }
    /***
     * 返回一个带有文件扩展名svg图标
     */
    async generateThumbnail(filePath){
        const extension = filePath.split('.').pop();

        // 创建一个SVG模板，这里只是一个简单的例子
        const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#000">${extension}</text>
        </svg>
        `;
        return {
            type:'svg',
            data:svg
        }
            
    }
}