import { thumbnail } from '../../server/endPoints.js'
import { isValidImageSrc,sanitizeUrl } from '../../utils/strings/imageSrc/index.js';
// 检查常用的缩略图或图标属性
const 常用图标属性 = [
    'icon', 'thumbnail', 'favicon', 'logo', 'image', 'picture', // 英文
    '图标', '缩略图', '网站图标', '标志', '图像', '图片', // 中文
    'ícono', 'miniatura', 'favicon', 'logotipo', 'imagen', 'foto', // 西班牙文
    'icône', 'vignette', 'favicon', 'logo', 'image', 'photo', // 法文
    'иконка', 'миниатюра', 'фавикон', 'логотип', 'изображение', 'фото' // 俄文
];
export const 提取缩略图路径中间件 = (布局控制器, 数据组) => {
    数据组.forEach(item => {
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
    });
    return 数据组;
}