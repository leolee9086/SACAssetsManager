import {listLocalDisks} from '../processors/fs/disk/diskInfo.js'
export async function listDisk(req,res,next){
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    let data=await listLocalDisks()
    console.log(data)
    res.end(JSON.stringify(data))
}
