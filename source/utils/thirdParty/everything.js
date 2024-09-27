//`http://localhost:${everthingPort.value}/?search=${encodeURIComponent(search.value)}&json=1&path_column=1&size_column=1&date_modified_column=1&date_created_column=1&count=100000`
export const buildEverythingSearchURL = (host, port, options = {}) => {
  let {
    search = '',
    showPathColumn = true,
    showSizeColumn = true,
    showDateModifiedColumn = true,
    showDateCreatedColumn = true,
    count = 100000
  } = options;

  const params = new URLSearchParams({
    search: search,
    json: 1,
    path_column: showPathColumn ? 1 : 0,
    size_column: showSizeColumn ? 1 : 0,
    date_modified_column: showDateModifiedColumn ? 1 : 0,
    date_created_column: showDateCreatedColumn ? 1 : 0,
    count: count
  });

  return `http://${host}:${port}/?${params.toString()}`;
};
export const testEverythingService = async (host, port) => {
  try {
    const url = buildEverythingSearchURL(host, port, { search: '', count: 1 });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 错误！状态: ${response.status}`);
    }
    const data = await response.json();
    // 检查返回的数据是否符合预期格式
    if (!Array.isArray(data)) {
      throw new Error('返回的数据格式不正确');
    }
    return true; // 服务正常运行
  } catch (error) {
    console.error('测试 Everything 服务时出错:', error);
    return false; // 服务不可用
  }
};


export const searchByEverything = async (searchValue, port, options = {host:'localhost'}) => {
  if ((!searchValue || searchValue.length < 2)&&!options.count) {
    return { enabled: false, fileList: null };
  }
  const everythingURL = buildEverythingSearchURL(options.host||'localhost', port, {
    search: searchValue,
    showPathColumn: true,
    showSizeColumn: true,
    showDateModifiedColumn: true,
    showDateCreatedColumn: true,
    count: options.count || 100000,
    ...options
  });
  try {
    const response = await fetch(everythingURL);
    const json = await response.json();
    if (json) {
      const fileList = json.results
        .filter(item => item.type === 'file')
        .map((item, index) => ({
          ...item,
          id: `local_entry${item.path}`,
          type: "local",
          path: (item.path + '/' + item.name).replace(/\\/g, '/'),
          mtimeMs: Number(item.date_modified), // 将 date_modified 转换为数字
          index
        }));

      return { enabled: true, fileList };
    }
  } catch (e) {
    if(!options.noError){
    console.error(e);
    }
  }

  return { enabled: false, fileList: null };
};


function parseEfuContent(content) {
  // 将内容按行分割
  const lines = content.split('\n');

  // 解析标题行
  const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());

  // 解析数据行
  const parsedData = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.replace(/"/g, '').trim());

    // 创建对象,将标题与值对应
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });

    // 解析时间戳(如果存在)
    if (entry['Date Modified']) {
      entry['Date Modified'] = parseWindowsTimestamp(entry['Date Modified']);
    }
    if (entry['Date Created']) {
      entry['Date Created'] = parseWindowsTimestamp(entry['Date Created']);
    }

    return entry;
  });
  let result =parsedData.map(
    item=>{
      return {
        id:`localEntrie_${item.Filename.replace(/\\/g,'/')}`,
        name:item.Filename.replace(/\\/g,'/').split('/').pop(),
        path:item.Filename.replace(/\\/g,'/'),
        size:item.Size,
        mtimeMs:item['Date Modified'],
        ctimeMs:item['Date Created'],
        type:'file'
      }
    }
  );
  return result
}
function parseWindowsTimestamp(windowsTimestamp) {
  if (!windowsTimestamp) return null;
  
  const WINDOWS_TICK = 10000000; // 100纳秒间隔
  const SECONDS_BETWEEN_1601_AND_1970 = 11644473600;
  
  const unixTimestamp = Number(windowsTimestamp) / WINDOWS_TICK - SECONDS_BETWEEN_1601_AND_1970;
  return new Date(unixTimestamp * 1000);
}

// ... 保留之前的 parseEfuContent 和 parseWindowsTimestamp 函数 ...

export async function parseEfuContentFromFile(filePath) {
  try {
    // 从文件读取内容
    const fs = require('fs').promises;

    const content = await fs.readFile(filePath, 'utf-8');
    
    // 使用之前定义的 parseEfuContent 函数解析内容
    const parsedData = parseEfuContent(content);
    
    return parsedData;
  } catch (error) {
    console.error('读取或解析文件时出错:', error);
    throw error;
  }
}
