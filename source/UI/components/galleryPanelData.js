import { parseEfuContentFromFile, searchByEverything } from '../../utils/thirdParty/everything.js';
import { 获取本地文件夹数据, 获取标签列表数据, 获取颜色查询数据, 处理默认数据, 获取文档中的文件链接, 获取本地文件列表数据 } from "../../data/siyuanAssets.js"
import {searchByAnytxt} from './localApi/anytxt/anytext.js'
export const 获取数据到缓存 = async (接口位置, 搜索函数, 搜索, 接口启用, 数据缓存) => {
    const url = new URL(接口位置);

    const { enabled: 启用, fileList: 文件列表 } = await 搜索函数(搜索, url.port, { count: 10240 });
    接口启用.value = 启用;

    if (启用 && 文件列表) {

        数据缓存.push(...文件列表);

    }
};
const 获取文件扩展名 = (项目) => {
    if (项目.type !== 'note') {
        return 项目.name.split('.').pop().toLowerCase();
    }
    return 'note';
};

const 检查扩展名是否匹配 = (选中扩展名, 文件扩展名) => {
    if (选中扩展名.length === 0) {
        return true;
    }
    return 选中扩展名.includes(文件扩展名);
};

export const 校验数据项扩展名 = (选中扩展名, 项目) => {
    const 文件扩展名 = 获取文件扩展名(项目);
    return 检查扩展名是否匹配(选中扩展名, 文件扩展名);
};

//抹平tab和浮窗的差异
export const 获取数据模型提供者类型 = (appData) => {
    if (appData.efuPath) {
        return 'efu文件列表';
    } else if (appData.localPath) {
        return '本地文件系统';
    } else if (appData.tagLabel) {
        return '思源标签';
    } else if (appData.color) {
        return '内部颜色索引';
    } else if (appData.everythingApiLocation) {
        return 'everything';
    } else if (appData.anytxtApiLocation) {
        return 'anytxt';
    } else {
        return '默认';
    }
};
export const 解析数据模型 = (appData, 数据缓存, $realGlob,apiEnabled) => {
    return {
        dataProviderType: 获取数据模型提供者类型(appData),
        efuPath: appData.efuPath,
        tagLabel: appData.tagLabel,
        color: appData.color,
        everythingApiLocation: appData.everythingApiLocation,
        anytxtApiLocation: appData.anytxtApiLocation,
        tab: appData.tab,
        block_id: appData.block_id,
        附件数据源: 数据缓存.data,
        realGlob: $realGlob,
        status:{
            apiEnabled
        }
    };
};
export const 根据数据配置获取数据到缓存 = (数据模型, signal,callBack) => {
    const dataFetchers = {
        'efu文件列表': () => fetchEfuData(数据模型.efuPath, 数据模型.附件数据源, callBack),
        '本地文件系统': () => 获取本地文件夹数据(数据模型.realGlob, 数据模型.附件数据源, callBack, 1, signal),
        '思源标签': () => 获取标签列表数据(数据模型.tagLabel, 数据模型.附件数据源, callBack, 1, signal, 数据模型.realGlob),
        '内部颜色索引': () => 获取颜色查询数据(数据模型.color, 数据模型.附件数据源, callBack, 1, signal, 数据模型.realGlob),
        'everything': () => 获取数据到缓存(数据模型.everythingApiLocation, searchByEverything, 数据模型.realGlob.search, 数据模型.status.apiEnabled, 数据模型.附件数据源),
        'anytxt': () => 获取数据到缓存(数据模型.anytxtApiLocation, searchByAnytxt, 数据模型.realGlob.search, 数据模型.status.apiEnabled, 数据模型.附件数据源),
        '默认': () => 处理默认数据(数据模型.tab, 数据模型.附件数据源, async () => {
            if (数据模型.block_id) {
                let files = await 获取文档中的文件链接(数据模型.block_id);
                获取本地文件列表数据(files, 数据模型.附件数据源, callBack, 1, signal);
                return;
            }
            nextTick(callBack);
        })
    };
    const fetcher = dataFetchers[数据模型.dataProviderType];
    return fetcher
};
const fetchEfuData = async (efuPath, dataTarget, callBack) => {
    let data;
    try {
        data = await parseEfuContentFromFile(efuPath);
        dataTarget.push(...data);
        callBack && callBack();
    } catch (e) {
        data = [];
    } finally {
        callBack && callBack();
    }
};
