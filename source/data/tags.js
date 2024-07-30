import { default as workspace } from "../polyfills/fs.js";
import { kernelApi, plugin } from "../asyncModules.js";
function traverseTags(tags, callback) {
    tags.forEach(tag => {
        callback(tag);
        if (tag.children && tag.children.length > 0) {
            traverseTags(tag.children, callback);
        }
    });
}
export async function saveTags(tags){
    await workspace.writeFile(`/data/storage/petal/${plugin.name}/tags.json`, JSON.stringify(tags));
    plugin.tags = tags
    return tags
}
export async function queryTags(tagLabel){
    let tag
    if(plugin.tags){
        tag = plugin.tags.find(item => item.label === tagLabel)
    }else{
        plugin.tags = await getTagAssets()
        tag = plugin.tags.find(item => item.label === tagLabel)
    }
    return tag
}
export async function getTagAssets(tags) {
    let data = [];
    if(!tags){
        tags = await kernelApi.getTag({sort:0})
    }
    if (await workspace.exists(`/data/storage/petal/${plugin.name}/tags.json`)) {
        console.log('tag assets', await workspace.readFile(`/data/storage/petal/${plugin.name}/tags.json`));
        data = JSON.parse(await workspace.readFile(`/data/storage/petal/${plugin.name}/tags.json`));
    } else {
        await workspace.writeFile(`/data/storage/petal/${plugin.name}/tags.json`, JSON.stringify([]));
    }

    /***
     * 遍历tags的逻辑
     * 如果data里面存在tags中不存在的内容记录,删除它
     * 如果tag里面存在data中不存在对应记录的条目,初始化data中对应条目为[]
     * 如果tag里面存在data中存在对应记录的条目,将data中对应条目的assets赋值给tag中对应条目的assets
     * 使用for循环遍历避免异步问题
     * 需要处理不能作为属性名的特殊字符的问题
     */
    let existingLabels = new Set();

    for (let i = 0; i < tags.length; i++) {
        traverseTags([tags[i]], (item) => {
            existingLabels.add(item.label);
            let dataItem = data.find(d => d.label === item.label);
            if (dataItem) {
                item.assets = dataItem.assets;
                // 移除removed标记（如果存在）
                if (dataItem.removed) {
                    delete dataItem.removed;
                }
            } else {
                item.assets = [];
                console.log('item', item);
                data.push({ label: item.label, assets: [], ...item });
            }
        });
    }

    /**
     * 标记data中不存在于tags中的记录为removed
     */
    data.forEach(item => {
        if (!existingLabels.has(item.label) && !item.removed) {
            item.removed = true;
        }
        if (item.children) {
            delete item.children;
        }
    });
    // 保存更新后的data
    await workspace.writeFile(`/data/storage/petal/${plugin.name}/tags.json`, JSON.stringify(data));
    plugin.tags = data

    return data;
}