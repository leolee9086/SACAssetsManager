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


export const searchByEverything = async (searchValue, port, options = {}) => {
    if (!searchValue || searchValue.length < 2) {
      return { enabled: false, fileList: null };
    }
    const everythingURL = buildEverythingSearchURL('localhost', port, {
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
            mtimems: item.date_modified,
            index
          }));
  
        return { enabled: true, fileList };
      }
    } catch (e) {
      console.error(e);
    }
  
    return { enabled: false, fileList: null };
  };