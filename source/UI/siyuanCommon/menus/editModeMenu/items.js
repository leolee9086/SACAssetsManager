import { thumbnail, uploadThumbnail } from "../../../../server/endPoints.js"
import { 从文件加载菜单项目 } from "../utils/menuItemloader.js"
import { plugin } from "../../../../pluginSymbolRegistry.js"
import { 选择标签 } from "../../dialog/tagPicker.js"
export const 编辑附件标签组 = (assets) => {
    return {
        'label': plugin.翻译`编辑${assets.length}个文件的标签`,
        'click': () => {
            选择标签()
        }
    }
}
export const 重新计算文件颜色 = (assets) => {
    return {
        'label': plugin.翻译`重新计算${assets.length}个文件的颜色`,
        'click': () => {
            assets.forEach(
                asset => {
                    let url = thumbnail.getColor(asset.type, asset.path, true)
                    fetch(url)
                }
            )
        }
    }
}
export const [d5a内置缩略图, d5a内置缩略图单次确认] = await 从文件加载菜单项目(import.meta.resolve('./formats/d5a.js'))
export const [打开图片编辑器对话框,打开简版图片编辑器]=await 从文件加载菜单项目(import.meta.resolve('./formats/images.js'))
export const 上传缩略图 = (assets) => {
    return {
        'label': plugin.翻译`上传缩略图`,
        'click': () => {
            assets.forEach(asset => {
                // 创建文件输入元素
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';

                fileInput.onchange = (event) => {
                    const file = event.target.files[0];
                    uploadThumbnail(asset, file)
                };

                // 触发文件选择对话框
                fileInput.click();

            });
        }
    }
}
export const 从剪贴板上传缩略图 = (assets) => {
    return {
        'label': plugin.翻译`从系统剪贴板更新缩略图`,
        'click': () => {
            assets.forEach(asset => {
                navigator.clipboard.read()
                    .then(clipboardItems => {
                        for (const clipboardItem of clipboardItems) {
                            if (clipboardItem.types.includes('image/png') || clipboardItem.types.includes('image/jpeg')) {
                                clipboardItem.getType('image/png')
                                    .then(blob => {
                                        uploadThumbnail(asset, blob)
                                    });
                                break;
                            }
                        }
                    })
                    .catch(error => {
                        console.error('读取剪贴板失败:', error);
                    });
            });
        }
    }
}