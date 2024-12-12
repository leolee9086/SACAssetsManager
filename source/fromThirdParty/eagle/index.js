// Eagle API 配置
const API_CONFIG = {
    DEFAULT_HOST: 'localhost',
    DEFAULT_PORT: 41595,
    DEFAULT_LIMIT: 100,
    ENDPOINTS: {
        ITEMS: '/api/item/list',
        FOLDERS: '/api/folder/list',
        LIBRARIES: '/api/library/list',
        SEARCH: '/api/item/search'
    }
};

// 构建基础请求参数
const buildSearchParams = (query, options = {}) => ({
    keyword: query,
    limit: options.limit || API_CONFIG.DEFAULT_LIMIT,
    offset: options.offset || 0,
    orderBy: options.orderBy || 'modificationTime',
    orderDirection: options.orderDirection || 'desc',
    folderId: options.folderId || ''
});

// API 请求处理
const makeApiRequest = async (endpoint, params = {}, options = {}) => {
    const { host = API_CONFIG.DEFAULT_HOST, port = API_CONFIG.DEFAULT_PORT } = options;
    const url = `http://${host}:${port}${endpoint}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });

    if (!response.ok) {
        throw new Error('Eagle API请求失败');
    }

    const data = await response.json();
    if (data.status !== 'success') {
        throw new Error(data.message || 'Eagle API响应包含错误');
    }

    return data.data;
};

// 主搜索入口
export const searchByEagle = async (...args) => {
    try {
        const result = await performSearch(...args);
        return {
            fileList: result,
            enabled: true
        };
    } catch (e) {
        console.error('Eagle搜索失败:', e);
        return { enabled: false };
    }
};

// 执行搜索
export const performSearch = async (search, options = {}) => {
    try {
        const params = buildSearchParams(search, options);
        const data = await makeApiRequest(API_CONFIG.ENDPOINTS.SEARCH, params, options);
        return convertEagleResult(data.items);
    } catch (error) {
        console.error('搜索失败:', error);
        throw error;
    }
};

// 获取文件夹列表
export const getFolders = async (options = {}) => {
    try {
        const data = await makeApiRequest(API_CONFIG.ENDPOINTS.FOLDERS, {}, options);
        return convertEagleFolders(data);
    } catch (error) {
        console.error('获取文件夹列表失败:', error);
        throw error;
    }
};

// 获取资源库列表
export const getLibraries = async (options = {}) => {
    try {
        const data = await makeApiRequest(API_CONFIG.ENDPOINTS.LIBRARIES, {}, options);
        return convertEagleLibraries(data);
    } catch (error) {
        console.error('获取资源库列表失败:', error);
        throw error;
    }
};

// 转换 Eagle 搜索结果为标准格式
function convertEagleResult(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.map(item => ({
        id: `eagleItem_${item.id}`,
        name: item.name,
        path: item.url || item.path,
        size: item.size || 0,
        mtimeMs: new Date(item.modificationTime).getTime(),
        ctimeMs: new Date(item.createTime).getTime(),
        type: 'file',
        metadata: {
            tags: item.tags,
            annotation: item.annotation,
            folderId: item.folderId,
            thumbnail: item.thumbnail
        }
    }));
}

// 转换 Eagle 文件夹结果
function convertEagleFolders(folders) {
    if (!Array.isArray(folders)) {
        return [];
    }
    return folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        children: folder.children ? convertEagleFolders(folder.children) : [],
        modificationTime: folder.modificationTime,
        createTime: folder.createTime
    }));
}

// 转换 Eagle 资源库结果
function convertEagleLibraries(libraries) {
    if (!Array.isArray(libraries)) {
        return [];
    }

    return libraries.map(library => ({
        id: library.id,
        name: library.name,
        path: library.path,
        folders: library.folders || [],
        modificationTime: library.modificationTime,
        createTime: library.createTime
    }));
}

// 检查 API 可用性
export const checkApiAvailability = async (options = {}) => {
    try {
        await makeApiRequest(API_CONFIG.ENDPOINTS.LIBRARIES, {}, options);
        return true;
    } catch (error) {
        console.error('Eagle API检查失败:', error);
        return false;
    }
}; 