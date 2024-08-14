import { listLocalDisks } from "../../../data/diskInfo";
const fs=require('fs')
const disks=listLocalDisks()
// 监听文件变化
//当文件变化时，通知所有订阅者
const emitter=globalThis.fsEmitter||new EventEmitter()
globalThis.fsEmitter=emitter
disks.forEach(disk=>{
    fs.watch(disk,{recursive:true},(eventType,filename)=>{
        
        emitter.emit('fsChange',{disk,eventType,filename})
    })
})
export default emitter

