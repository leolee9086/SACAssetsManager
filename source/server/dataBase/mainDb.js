export {
    计算哈希 ,
    删除缩略图缓存行,
    写入缩略图缓存行 ,
    查找子文件夹 ,
    查找文件hash ,
    查找文件状态 ,
    查找文件夹状态 ,
    查找并解析文件状态 ,
    提取所有子目录文件扩展名 ,
} from './mainDbSQL.js'
/*import {
    计算哈希 as 计算哈希LMDB,
    删除缩略图缓存行 as 删除缩略图缓存行LMDB,
    写入缩略图缓存行 as 写入缩略图缓存行LMDB,
    查找子文件夹 as 查找子文件夹LMDB,
    查找文件hash as 查找文件hashLMDB,
    查找文件状态 as 查找文件状态LMDB,
    查找文件夹状态 as 查找文件夹状态LMDB,
    查找并解析文件状态 as 查找并解析文件状态LMDB,
    提取所有子目录文件扩展名 as 提取所有子目录文件扩展名LMDB,
} from './mainDbLMDB.js'

import {
    计算哈希 as 计算哈希SQL,
    删除缩略图缓存行 as 删除缩略图缓存行SQL,
    写入缩略图缓存行 as 写入缩略图缓存行SQL,
    查找子文件夹 as 查找子文件夹SQL,
    查找文件hash as 查找文件hashSQL,
    查找文件状态 as 查找文件状态SQL,
    查找文件夹状态 as 查找文件夹状态SQL,
    查找并解析文件状态 as 查找并解析文件状态SQL,
    提取所有子目录文件扩展名 as 提取所有子目录文件扩展名SQL,
} from './mainDbSQL.js'

// 添加计数器和累加器
const 性能统计 = new Map();

// 性能对比包装函数
async function 性能对比执行(函数名, LMDB函数, SQL函数, ...参数) {
    // 初始化该函数的统计数据
    if (!性能统计.has(函数名)) {
        性能统计.set(函数名, {
            执行次数: 0,
            LMDB总耗时: 0,
            SQL总耗时: 0
        });
    }
    
    const 统计数据 = 性能统计.get(函数名);
    
    // 执行并记录时间
    const LMDB开始时间 = Date.now();
    const LMDB结果 = await LMDB函数(...参数);
    const LMDB耗时 = Date.now() - LMDB开始时间;

    const SQL开始时间 = Date.now();
    await SQL函数(...参数);
    const SQL耗时 = Date.now() - SQL开始时间;

    // 更新统计数据
    统计数据.执行次数++;
    统计数据.LMDB总耗时 += LMDB耗时;
    统计数据.SQL总耗时 += SQL耗时;

    // 每1000次执行后输出统计结果
    if (统计数据.执行次数 % 1000 === 0) {
        const LMDB平均耗时 = 统计数据.LMDB总耗时 / 1000;
        const SQL平均耗时 = 统计数据.SQL总耗时 / 1000;
        
        console.log(`${函数名} 1000次执行性能对比:
            LMDB平均耗时: ${LMDB平均耗时.toFixed(2)}ms
            SQL平均耗时: ${SQL平均耗时.toFixed(2)}ms
            平均性能差异: ${Math.abs(LMDB平均耗时 - SQL平均耗时).toFixed(2)}ms
            更快的是: ${LMDB平均耗时 < SQL平均耗时 ? 'LMDB' : 'SQL'}
        `);

        // 重置统计数据
        统计数据.执行次数 = 0;
        统计数据.LMDB总耗时 = 0;
        统计数据.SQL总耗时 = 0;
    }

    return LMDB结果;
}

// 导出所有包装后的函数
export async function 计算哈希(...参数) {
    return 性能对比执行('计算哈希', 计算哈希LMDB, 计算哈希SQL, ...参数);
}

export async function 删除缩略图缓存行(...参数) {
    return 性能对比执行('删除缩略图缓存行', 删除缩略图缓存行LMDB, 删除缩略图缓存行SQL, ...参数);
}

export async function 写入缩略图缓存行(...参数) {
    return 性能对比执行('写入缩略图缓存行', 写入缩略图缓存行LMDB, 写入缩略图缓存行SQL, ...参数);
}

export async function 查找子文件夹(...参数) {
    return 性能对比执行('查找子文件夹', 查找子文件夹LMDB, 查找子文件夹SQL, ...参数);
}

export async function 查找文件hash(...参数) {
    return 性能对比执行('查找文件hash', 查找文件hashLMDB, 查找文件hashSQL, ...参数);
}

export async function 查找文件状态(...参数) {
    return 性能对比执行('查找文件状态', 查找文件状态LMDB, 查找文件状态SQL, ...参数);
}

export async function 查找文件夹状态(...参数) {
    return 性能对比执行('查找文件夹状态', 查找文件夹状态LMDB, 查找文件夹状态SQL, ...参数);
}

export async function 查找并解析文件状态(...参数) {
    return 性能对比执行('查找并解析文件状态', 查找并解析文件状态LMDB, 查找并解析文件状态SQL, ...参数);
}

export async function 提取所有子目录文件扩展名(...参数) {
    return 性能对比执行('提取所有子目录文件扩展名', 提取所有子目录文件扩展名LMDB, 提取所有子目录文件扩展名SQL, ...参数);
}*/