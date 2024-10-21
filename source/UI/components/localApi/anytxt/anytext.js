import { listLocalDisks } from "../../../../data/diskInfo.js";
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
    host: 'localhost',
    filterDir: null
}) => {
    try {
        let allResults = [];

        if (options.filterDir) {
            // 如果指定了 filterDir，只搜索指定目录
            allResults = await searchInDirectory(search, port, options);
        } else {
            // 如果没有指定 filterDir，搜索所有磁盘
            const drives = await listLocalDisks();
            for (const drive of drives) {
                try{
                const driveResults = await searchInDirectory(search, port, { ...options, filterDir: `${drive.name}` });
                allResults = allResults.concat(driveResults);
                }catch(e){
                    console.warn(e)
                }
            }
        }

        console.log('搜索结果:', allResults);
        return allResults;
    } catch (error) {
        console.error('搜索失败:', error);
        throw error;
    }
};

async function searchInDirectory(search, port, options) {
    const getResultResponse = await fetch(`http://${options.host || 'localhost'}:${port}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: Date.now(),
            jsonrpc: "2.0",
            method: "ATRpcServer.Searcher.V1.GetResult",
            params: {
                input: {
                    pattern: search,
                    filterDir: options.filterDir,
                    filterExt: '*',
                    lastModifyBegin: 0,
                    lastModifyEnd: 2147483647,
                    limit: 300,
                    offset: 0,
                    order: 0
                }
            }
        })
    });

    if (!getResultResponse.ok) {
        throw new Error('获取搜索结果失败');
    }

    const data = await getResultResponse.json();
    if (data.error) {
        throw new Error(data.error.message || '获取搜索结果过程中发生错误');
    }

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
export const checkApiAvailability = async (port, host = 'localhost') => {
    try {
        const response = await fetch(`http://${host}:${port}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: 1,
                jsonrpc: "2.0",
                method: "ATRpcServer.Searcher.V1.Search",
                params: {
                    input: {
                        pattern: "",
                        filterDir: "",
                        filterExt: "*",
                        lastModifyBegin: 0,
                        lastModifyEnd: 2147483647
                    }
                }
            })
        });

        return response.ok;
    } catch (error) {
        console.error('API检查失败:', error);
        return false;
    }
};

