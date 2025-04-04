import Mingo from './mingo.js'

/**
 * Mingo数据库查询库
 * @namespace Mingo
 */
export { Mingo }

/**
 * 创建Mingo查询对象
 * @param {Object} query - 查询条件对象
 * @returns {Mingo.Query} Mingo查询实例
 * @throws {Error} 当查询条件为空或无效时抛出错误
 */
export const 创建mingo查询 = (query) => {
    if (!query) {
        throw new Error('查询条件不能为空');
    }
    
    try {
        return new Mingo.Query(query);
    } catch (error) {
        console.error('创建Mingo查询失败:', error);
        throw new Error('无效的查询条件');
    }
}

/**
 * 执行查询并返回所有匹配文档
 * @param {Object} query - 查询条件对象
 * @param {Array} 数据集 - 要查询的数据集合
 * @returns {Array} 匹配的文档数组
 */
export const 执行mingo查询 = (query, 数据集) => {
    const mingo查询 = 创建mingo查询(query);
    return mingo查询.find(数据集).all();
}

/**
 * 测试单个文档是否匹配查询条件
 * @param {Object} query - 查询条件对象
 * @param {Object} 文档 - 要测试的文档
 * @returns {Boolean} 是否匹配
 */
export const 测试mingo匹配 = (query, 文档) => {
    const mingo查询 = 创建mingo查询(query);
    return mingo查询.test(文档);
}

/**
 * 查询并返回第一个匹配的文档
 * @param {Object} query - 查询条件对象
 * @param {Array} 数据集 - 要查询的数据集合
 * @returns {Object|null} 第一个匹配的文档或null
 */
export const 查询单个文档 = (query, 数据集) => {
    const mingo查询 = 创建mingo查询(query);
    const 结果 = mingo查询.find(数据集).first();
    return 结果 || null;
}

/**
 * 执行查询并按照指定规则排序
 * @param {Object} query - 查询条件对象
 * @param {Array} 数据集 - 要查询的数据集合
 * @param {Object} 排序规则 - 排序规则对象，如: { name: 1 }
 * @returns {Array} 排序后的文档数组
 */
export const 查询并排序 = (query, 数据集, 排序规则) => {
    const mingo查询 = 创建mingo查询(query);
    return mingo查询.find(数据集).sort(排序规则).all();
}

/**
 * 分页查询数据
 * @param {Object} query - 查询条件对象
 * @param {Array} 数据集 - 要查询的数据集合
 * @param {Number} [页码=1] - 当前页码
 * @param {Number} [每页数量=10] - 每页文档数
 * @returns {Object} 包含数据和总数的对象 { 数据: Array, 总数: Number }
 */
export const 分页查询 = (query, 数据集, 页码 = 1, 每页数量 = 10) => {
    const mingo查询 = 创建mingo查询(query);
    const 跳过 = (页码 - 1) * 每页数量;
    return {
        数据: mingo查询.find(数据集).skip(跳过).limit(每页数量).all(),
        总数: mingo查询.find(数据集).count()
    };
}

/**
 * 执行聚合管道查询
 * @param {Array} 管道 - 聚合管道数组
 * @param {Array} 数据集 - 要查询的数据集合
 * @returns {Array} 聚合结果
 * @throws {Error} 当聚合管道无效时抛出错误
 */
export const 聚合查询 = (管道, 数据集) => {
    try {
        const 聚合器 = new Mingo.Aggregator(管道);
        return 聚合器.run(数据集);
    } catch (error) {
        console.error('聚合查询失败:', error);
        throw new Error('无效的聚合管道');
    }
}

/**
 * 执行查询并返回指定字段
 * @param {Object} query - 查询条件对象
 * @param {Array} 数据集 - 要查询的数据集合
 * @param {Object} 投影字段 - 要返回的字段对象，如: { name: 1, age: 1 }
 * @returns {Array} 包含指定字段的文档数组
 */
export const 字段投影查询 = (query, 数据集, 投影字段) => {
    const mingo查询 = 创建mingo查询(query);
    return mingo查询.find(数据集).project(投影字段).all();
}
