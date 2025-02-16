import { kernelApi } from "../../../asyncModules.js";

// 获取最早创建时间
export const getEarliestCreated = async () => {
    const sql = `select created from blocks order by created asc limit 1`;
    const result = await kernelApi.sql({ stmt: sql });
    return result.length > 0 ? result[0].created : null;
};

// 获取最新创建时间
export const getLatestCreated = async () => {
    const sql = `select created from blocks order by created desc limit 1`;
    const result = await kernelApi.sql({ stmt: sql });
    return result.length > 0 ? result[0].created : null;
};

// 获取所有有内容的日期
export const getAllDates = async () => {
    const sql = `select distinct substr(created, 1, 8) as date from blocks where content  order by date asc`;
    const result = await kernelApi.sql({ stmt: sql });
    return result.map(item => item.date);
};

export const getAlltext = async (startDate, endDate, limit = 10000) => {
    let sql = `select content, created from blocks where content  `;
    
    if (startDate) {
        sql += ` and created >= '${startDate}'`;
    }
    if (endDate) {
        sql += ` and created < '${endDate}'`;
    }
    
    sql += ` order by created asc limit ${limit}`;
    
    const result = await kernelApi.sql({ stmt: sql });
    return result;
};

// 新增：按月获取数据
export const getMonthlyText = async (yearMonth, limit = 10000) => {
    const startDate = `${yearMonth}01000000`;
    const endDate = `${yearMonth}31235959`;
    return await getAlltext(startDate, endDate, limit);
};

