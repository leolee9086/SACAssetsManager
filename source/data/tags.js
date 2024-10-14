import { default as workspace } from "../polyfills/fs.js";
import { kernelApi, plugin } from "../asyncModules.js";
function 递归解析标签数据(tags, callback) {
    tags.forEach(tag => {
        callback(tag);
        if (tag.children && tag.children.length > 0) {
            递归解析标签数据(tag.children, callback);
        }
    });
}
export async function saveTags(tags) {
    await workspace.writeFile(`/data/storage/petal/${plugin.name}/tags.json`, JSON.stringify(tags));
    plugin.tags = tags
    return tags
}
export async function queryTags(tagLabel) {
    let tag
    if (plugin.tags) {
        tag = plugin.tags.find(item => item.label === tagLabel)
    } else {
        plugin.tags = await getTagAssets()
        tag = plugin.tags.find(item => item.label === tagLabel)
    }
    return tag
}
const 加载插件标签数据 = async () => {
    let data = [];
    if (await workspace.exists(`/data/storage/petal/${plugin.name}/tags.json`)) {
        data = JSON.parse(await workspace.readFile(`/data/storage/petal/${plugin.name}/tags.json`));
    } else {
        await workspace.writeFile(`/data/storage/petal/${plugin.name}/tags.json`, JSON.stringify([]));
    }
    return data;
}
/**
 * 标记data中不存在于tags中的记录为removed
 */
const 清理已移除的标签 = (data, existingLabels) => {
    data.forEach(item => {
        if (!existingLabels.has(item.label) && !item.removed) {
            item.removed = true;
        }
        if (item.removed) {
            item.count = 0;
        }
        if (item.children) {
            delete item.children;
        }
        if (item.assets) {
            item.assets = Array.from(new Set(item.assets));
        }
    });
}
const 收集已经存在的标签 = (tags, data) => {
    let existingLabels = new Set();
    for (let i = 0; i < tags.length; i++) {
        递归解析标签数据([tags[i]], (item) => {
            existingLabels.add(item.label);
            let dataItem = data.find(d => d.label === item.label);
            if (dataItem) {
                if (dataItem.removed) {
                    delete dataItem.removed;
                }
                dataItem.count = item.count;
            } else {
                data.push({ label: item.label, assets: [], ...item });
            }
        });
    }
    return existingLabels;
}
export async function getTagAssets(tags) {
    let data = await 加载插件标签数据()
    tags = await kernelApi.getTag({ sort: 0 })
    let existingLabels = 收集已经存在的标签(tags, data)
    清理已移除的标签(data, existingLabels)
    await saveTags(data)
    return data
}

/**
 * 从文件路径中找到所有相关的标签
 * @param {string} filePath - 文件路径
 * @returns {Array} - 相关标签的数组
 */
export function findTagsByFilePath(filePath) {
    let relatedTags = [];

    if (plugin.tags) {
        console.log(plugin.tags)
        递归解析标签数据(plugin.tags, (tag) => {
            if (tag.assets && tag.assets.find(item=>item === filePath)) {
                relatedTags.push(tag);
            }
        });
    }

    return relatedTags;
}