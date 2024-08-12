const fs = require('fs')
export class SvgLoader {
    constructor() {
    }
    async generateThumbnail(path) {
        try {
            const data = fs.readFileSync(path)
            return {
                type: 'svg',
                data: data
            }
        } catch (e) {
            console.log(e)
            throw new Error('Failed to generate thumbnail:' + e.message)
        }
    }
    match(path){
        return /\.(svg)$/i
    }
}