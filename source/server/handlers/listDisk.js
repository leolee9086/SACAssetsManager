import {listLocalDisks} from '../processors/fs/disk/diskInfo.js'
export async function listDisk(req,res,next){
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    let data=await listLocalDisks()
    res.end(JSON.stringify(data))
}
export async function isManagedDisk(req, res, next) {
    const path = require('path')
    try {
        const diskRoot = path.parse(req.path).root;
        const sacFolderPath = path.join(diskRoot, '.sac');

        fs.access(sacFolderPath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: false }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: true }));
            }
        });
    } catch (error) {
        next(error);
    }
}