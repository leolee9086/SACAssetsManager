import { thumbnail } from '../../server/endPoints.js'
import { isValidImageSrc,sanitizeUrl } from '../../../src/utils/strings/imageSrc/index.js';
import { findTagsByFilePath,findTagsByNoteID } from '../tags.js';

// 检查常用的缩略图或图标属性
const 常用图标属性 = [
    'icon', 'thumbnail', 'favicon', 'logo', 'image', 'picture', // 英文
    '图标', '缩略图', '网站图标', '标志', '图像', '图片', // 中文
    'ícono', 'miniatura', 'favicon', 'logotipo', 'imagen', 'foto', // 西班牙文
    'icône', 'vignette', 'favicon', 'logo', 'image', 'photo', // 法文
    'иконка', 'миниатюра', 'фавикон', 'логотип', 'изображение', 'фото' // 俄文
];

const 创建缩略图URL对象 = (item, 布局控制器) => {
    if (!item.thumbnailURL) {
        item.thumbnailURL = {
            get: async () => {
                for (const prop of 常用图标属性) {
                    if (typeof item[prop] === 'string' && isValidImageSrc(item[prop])) {
                        const sanitizedUrl = sanitizeUrl(item[prop]);
                        if (sanitizedUrl) {
                            return sanitizedUrl;
                        }
                    }
                }
                // 如果没有找到合适的属性，使用原有逻辑
                if (item.type) {
                    return thumbnail.genHref(item.type, item.path, 布局控制器.getCardSize(), item);
                } else {
                    return "/plugins/SACAssetsManager/assets/wechatDonate.jpg";
                }
            }
        }
    }
    return item;
}

export const 提取缩略图路径中间件 = (布局控制器, 数据组) => {
    数据组.forEach(item => 创建缩略图URL对象(item, 布局控制器));
    return 数据组;
}

const 创建NoteID对象 = (item) => {
    let $noteID = item.noteID;
    item.noteID = {
        type: 'sy_note_id',
        get: async () => {
            // 假设需要异步获取
            let id = item.type === 'note' ? item.id : $noteID;
            return id;
        },
        set: async (newID) => {
            if (item.type === 'note') {
                item.id = newID;
            } else {
                throw new Error('Cannot set ID for non-note type');
            }
        },
        render: async () => {
            return item.type === 'note' ? `Note ID: ${item.id}` : 'Not a note';
        },
        isEditable: async () => {
            // 只有当类型是笔不是笔记时,绑定的笔记ID才可以编辑
            return item.type !== 'note';
        },
        checker: async () => {
            return false;
        }
    };
    return item;
}

export const 提取NoteID中间件 = (数据组) => {
    数据组.forEach(item => 创建NoteID对象(item));
    return 数据组;
};

const 创建Tags对象 = (item) => {
    item.tags = async () => {
        const tags = [];
        if (item && item.type === 'note') {
            const data = await findTagsByNoteID(item.id);
            data.forEach(tagData => {
                tags.push({ label: tagData });
            });
        }
        if (item && item.path) {
            const fileTags = findTagsByFilePath(item.path);
            tags.push(...fileTags);
        }
        return tags;
    };
    return item;
}

export const 提取tags中间件 = (数据缓存) => {
    数据缓存.forEach(item => 创建Tags对象(item));
    return 数据缓存;
}