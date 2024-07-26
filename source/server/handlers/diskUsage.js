const { exec } = require('child_process');
const { statfs } = require('fs');
export async function listDisk(req,res,next){
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    let data=await listLocalDisks()
    console.log(data)
    res.end(JSON.stringify(data))
}
async function listLocalDisks() {
  let disks = [];
  const platform = process.platform;

  // 根据平台执行不同的命令获取磁盘列表
  let command;
  if (platform === 'darwin') {
    // macOS平台
    command = 'diskutil info | egrep "^Device / Media Name:" | sed -E "s/^Device / Media Name: (.*)$/\\1/"';
  } else if (platform === 'win32') {
    // Windows平台
    command = 'wmic logicaldisk get name';
  } else {
    // Unix-like平台
    command = 'df -P | tail -n +2 | awk \'{print $1}\'';
  }

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }

      if (platform === 'darwin') {
        // macOS 使用 diskutil 获取的磁盘列表可能包含一些特殊字符，需要清理
        disks = stdout.split('\n').filter(Boolean).map(disk => disk.trim().replace(/"/g, ''));
      } else {
        // Windows 和 Linux 直接使用 stdout 分割获取磁盘列表
        disks = stdout.split('\n').filter(Boolean).map(disk => disk.trim());
      }

      Promise.all(disks.map(disk => {
        return new Promise((resolveDisk, rejectDisk) => {
          statfs(disk, (err, stats) => {
            if (err) {
              rejectDisk(err);
            } else {
              resolveDisk({
                disk,
                type: stats.type,
                total: stats.blocks * stats.bsize / 1024 / 1024, // 转换为MB
                free: stats.bfree * stats.bsize / 1024 / 1024 // 转换为MB
              });
            }
          });
        });
      })).then(disksInfo => {
        resolve(disksInfo);
      }).catch(err => {
        reject(err);
      });
    });
  });
}

