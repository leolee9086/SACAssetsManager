import { kernelApi } from "../asyncModules.js";
import { cleanAssetPath } from "./utils/assetsName.js";
import { applyURIStreamJson } from "./fetchStream.js";


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
    let data = await kernelApi.sql(
        {
            stmt: sql,
        }
    )
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

export { applyURIStreamJson }
