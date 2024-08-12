import { kernelApi } from "../asyncModules.js";
import mingo from '../../static/mingo.js'
import { cleanAssetPath } from "./utils/assetsName.js";
import { applyURIStreamJson } from "./fetchStream.js";
function loadFilters(galleryDefine) {
    return galleryDefine.filters.map(
        item => {
            return {
                name: item.name,
                describe: item.describe,
                fn: (content) => {
                    return mingo.filter(content, item.filter)
                }
            }
        }
    )
}
function loadBreadCrumb(galleryDefine) {
    return galleryDefine.breadCrumb
}
function loadGetter(galleryDefine) {
    switch (galleryDefine.type) {
        case 'siyuanSql':
            let stmt = galleryDefine.getter.stmt;
            return applyStmt(stmt);
        case 'glob':
            return galleryDefine.getter.getter;
        case 'url':
            return galleryDefine.getter.getter;
        default:
            return galleryDefine.content
    }
}
function loadSorters(galleryDefine) {
    return galleryDefine.sorters.map(
        item => {
            return {
                name: item.name,
                describe: item.describe,
                fn: (content) => {
                    return content.sort(item.sorter)
                }
            }
        }
    )
}

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
