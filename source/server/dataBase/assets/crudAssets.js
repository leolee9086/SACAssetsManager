const fs = require('fs');
const path = require('path');



export const addAssetsFromUri = (uri, meta) => {
  const type = getType(uri);
  let size = -1; // 默认大小为 -1，表示未知或不适用

  if (type === 'file') {
    // 异步获取文件大小
    fs.stat(uri.replace('file://', ''), (err, stats) => {
      if (err) {
        console.error('Error getting file size:', err);
      } else {
        size = stats.size;
      }
    });
  }

  const row = {
    uri: uri,
    // 文件名，从uri提取，如果meta中存在name，则使用meta中的name
    name: meta.name || path.basename(uri),
    // 文件类型，本地文件是file，笔记内容是note，远程文件是remote
    type: type,
    // 对本地文件，使用fs获取，其他类型标记为-1
    size: size,
    color: meta.color,
    attributes: meta.attributes,
  };

  // 这里应该有一些逻辑来处理 row 对象，例如保存到数据库或数组中
  // 例如：saveAsset(row);
  
  return row; // 根据需要返回 row 对象
};
