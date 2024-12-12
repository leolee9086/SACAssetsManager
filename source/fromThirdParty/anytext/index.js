import { listLocalDisks } from "../../data/diskInfo.js";
// 将 API 相关的配置抽取出来
const API_CONFIG = {
    DEFAULT_HOST: 'localhost',
    DEFAULT_LIMIT: 300,
    MAX_TIMESTAMP: 2147483647,
    ENDPOINTS: {
        SEARCH: 'ATRpcServer.Searcher.V1.GetResult',
        CHECK: 'ATRpcServer.Searcher.V1.Search'
    }
};
// 将搜索参数构建抽取为独立函数
const buildSearchParams = (search, options) => ({
    pattern: search,
    filterDir: options.filterDir || '',
    filterExt: '*',
    lastModifyBegin: 0,
    lastModifyEnd: API_CONFIG.MAX_TIMESTAMP,
    limit: options.limit || API_CONFIG.DEFAULT_LIMIT,
    offset: 0,
    order: 0
});
// 将 API 请求抽取为独立函数
const makeApiRequest = async (port, host, method, params) => {
    const response = await fetch(`http://${host}:${port}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: Date.now(),
            jsonrpc: "2.0",
            method,
            params: { input: params }
        })
    });
    if (!response.ok) {
        throw new Error('API请求失败');
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || 'API响应包含错误');
    }
    return data;
};
export const searchByAnytxt = async (...args) => {
    try {
        let result = await performSearch(...args)
        if (result) {
            return {
                fileList: result,
                enabled: true
            }
        }
    } catch (e) {
        return { enabled: false }
    }
}
export const performSearch = async (search, port, options = {
    host: API_CONFIG.DEFAULT_HOST,
    filterDir: null
}) => {
    try {
        let allResults = [];

        if (options.filterDir) {
            allResults = await searchInDirectory(search, port, options);
        } else {
            allResults = await searchAllDrives(search, port, options);
        }
        console.log('搜索结果:', allResults);
        return allResults;
    } catch (error) {
        console.error('搜索失败:', error);
        throw error;
    }
};
// 新增函数：搜索所有驱动器
async function searchAllDrives(search, port, options) {
    const drives = await listLocalDisks();
    const results = [];
    
    for (const drive of drives) {
        try {
            const driveResults = await searchInDirectory(search, port, { 
                ...options, 
                filterDir: `${drive.name}` 
            });
            results.push(...driveResults);
        } catch(e) {
            console.warn(`搜索驱动器 ${drive.name} 失败:`, e);
        }
    }
    return results;
}
async function searchInDirectory(search, port, options) {
    const params = buildSearchParams(search, options);
    const data = await makeApiRequest(
        port, 
        options.host || API_CONFIG.DEFAULT_HOST,
        API_CONFIG.ENDPOINTS.SEARCH, 
        params
    );   
    return convertAnyTXTResult(data.result.data.output);
}

function convertAnyTXTResult(output) {
    if (!output || !output.field || !output.files) {
        return [];
    }
    const fields = output.field;
    return output.files.map(file => {
        const fileObj = {};
        fields.forEach((field, index) => {
            fileObj[field] = file[index];
        });

        const path = fileObj.file.replace(/\\/g, '/');
        return {
            id: `localEntrie_${path}`,
            name: path.split('/').pop(),
            path: path,
            size: fileObj.size,
            mtimeMs: new Date(fileObj.lastModify * 1000).getTime(),
            ctimeMs: null, // AnyTXT 似乎没有提供创建时间
            type: 'file',
            fid: fileObj.fid
        };
    });
}

export const checkApiAvailability = async (port, host = API_CONFIG.DEFAULT_HOST) => {
    try {
        const params = buildSearchParams('', { filterDir: '' });
        await makeApiRequest(port, host, API_CONFIG.ENDPOINTS.CHECK, params);
        return true;
    } catch (error) {
        console.error('API检查失败:', error);
        return false;
    }
};

