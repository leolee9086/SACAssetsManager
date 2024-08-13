export default class syLoader{
    constructor(){
        this.buffer = null
        this.type = 'image/png'
        this.filePath = "C:/Users/al765/AppData/Local/Programs/SiYuan/resources/stage/icon.png"
        this.buffer = require('fs').readFileSync(this.filePath)
    }
    async generateThumbnail(path,width,height){
        let that = this
        return {
            type:'image/jpeg',
            data:await that.buffer
        }
    }
    match(){
        return /\.(sy)$/i
    }
}