export default class EagleLoader {
    constructor() {
        this.commonIcons = new Map()
    }
    async generateThumbnail(filePath) {
        const name = filePath.split('/').pop()
        const dir = filePath.split('/').slice(0, -1).join('/')
        const cleanedName = name.split('.')[0]
        const iconPath = `${dir}/${cleanedName}_thumbnail.png`        
        if(fs.existsSync(iconPath)){
            return fs.readFileSync(iconPath)
        }
        return null
    }
    match(filePath){
        // 匹配所有路径中包含.library/images或者.library\\\\images的文件
        return /.*\.library\\\\images|.*\.library\/images/
    }
    sys = ['win32 x64']
}