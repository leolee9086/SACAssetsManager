import {plugin} from '../asyncModules.js'
export const listLocalDisks=async()=>{
    const res=await fetch(`http://localhost:${plugin.http服务端口号}/listDisk`)
    const data=await res.json()
    return data
}
 