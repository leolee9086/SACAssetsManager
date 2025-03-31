import {listLocalDisks} from '../processors/fs/disk/diskInfo.js'
import { 日志 } from '../utils/logger.js';

export async function listDisk(req,res,next){
    日志.信息('开始获取本地磁盘列表', 'DiskHandler');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    let data = await listLocalDisks()
    日志.信息(`获取本地磁盘列表完成: ${JSON.stringify(data)}`, 'DiskHandler');
    res.end(JSON.stringify(data))
}

export async function isManagedDisk(req, res, next) {
    const path = require('path')
    try {
        const diskRoot = path.parse(req.path).root;
        const sacFolderPath = path.join(diskRoot, '.sac');
        日志.信息(`检查磁盘是否受管理: ${diskRoot}`, 'DiskHandler');

        fs.access(sacFolderPath, fs.constants.F_OK, (err) => {
            if (err) {
                日志.信息(`磁盘未受管理: ${diskRoot}`, 'DiskHandler');
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: false }));
            } else {
                日志.信息(`磁盘受管理: ${diskRoot}`, 'DiskHandler');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: true }));
            }
        });
    } catch (error) {
        日志.错误(`检查磁盘管理状态时出错: ${error}`, 'DiskHandler');
        next(error);
    }
}