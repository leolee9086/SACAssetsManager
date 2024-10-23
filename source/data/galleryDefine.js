import { kernelApi } from "../asyncModules.js";
import { cleanAssetPath } from "./utils/assetsName.js";
import { applyURIStreamJson, applyURIStreamJsonCompatible } from "./fetchStream.js";
import { 转换笔记查询结果到附件项 } from "./transform/toAssetItem.js";


/***
 * 获取使用的函数
 *
 */
function siyuanSqlParser(query, params) {
    return query.replace(/\?/g, (match) => {
        return params.shift(); // 从参数数组中取出第一个元素并替换占位符
    });
}
export async function applyStmt(stmt) {
    let query = stmt.query;
    let params = stmt.params;
    let sql = query;
    if (params) {
        sql = siyuanSqlParser(query, params)
    }
    const sqlParts = sql.split(/\s+/);



    let data = await kernelApi.sql(
        {
            stmt: sql,
        }
    )
    // 检查SQL语句的关键字顺序
    if (
        sqlParts[0].toLowerCase() === "select" &&
        sqlParts[1] === "*" &&
        sqlParts[2].toLowerCase() === "from" &&
        sqlParts[3].toLowerCase() === "blocks") {
    } {
        return await 转换笔记查询结果到附件项(data)
    }
    return data.map(
        (item, i) => {
            return {
                index: i,
                format: item.path.split('.').pop(),
                cleanPath: cleanAssetPath(item.path),
                path: item.path,
                ...item
            }
        }
    )
}
export { applyURIStreamJson, applyURIStreamJsonCompatible }
