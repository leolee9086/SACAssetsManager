import { plugin } from "../../../pluginSymbolRegistry.js"
//这里还依赖插件实例,之后要改掉
const 根据路径获取eagle标签列表 = async (eaglePath) => {
    try {
        const res = await fetch(`http://localhost:${plugin.http服务端口号}/eagle-tags?path=${eaglePath}`)
        const json = await res.json()
        return json
    } catch (error) {
        console.error('获取Eagle标签列表失败:', error)
        throw error
    }
}

const 根据本地路径获取eagle素材库路径 = async (localPath) => {
    try {
        const res = await fetch(`http://localhost:${plugin.http服务端口号}/eagle-path?path=${localPath}`)
        const json = await res.json()
        return json.finded
    } catch (error) {
        console.error('获取Eagle素材库路径失败:', error)
        throw error
    }
}
