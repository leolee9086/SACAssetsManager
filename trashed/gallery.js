import mingo from '../../static/mingo.js'

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