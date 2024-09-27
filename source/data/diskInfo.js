import { fs } from '../server/endPoints.js'
export const listLocalDisks=async()=>{
    const res=await fetch(fs.disk.listLocalDisks())
    const data=await res.json()
    return data
}
 