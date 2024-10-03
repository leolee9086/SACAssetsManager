import { thumbnail } from "../../../../server/endPoints.js"
import { confirmAsPromise } from "../../../../utils/siyuanUI/confirm.js"
import { addFileToZip } from "../../../../utils/zip/modify.js"
export const 重新计算文件颜色 = (assets)=>{
    return {
        'label':'重新计算文件颜色',
        'click':()=>{
            assets.forEach(
                asset=>{
                    let url = thumbnail.getColor(asset.type,asset.path,true)
                    fetch(url)
                }
            )
        }
    }
}
export const d5a内置缩略图=(assets)=>{
    const d5aCount = assets.filter(
        item=>{
            return item.path.endsWith('.d5a')
        }
    ).length
    return {
        label:`尝试寻找并内置缩略图(${d5aCount}个d5a文件)`,
        click: async () => {
            const path = require('path')
            const fs = require('fs')
            for await (const asset of assets) {
                // 找到文件夹下的.cache文件夹下的同名子文件夹,
                // 并将其中的icon.jpg文件写入到d5a中(d5a文件实际上是一个zip)
                if (asset && asset.path.endsWith('.d5a')) {
                    const dirname = path.dirname(asset.path)
                    const cachePath = path.join(dirname, '.cache', path.basename(asset.path))
                    const iconPath = path.join(cachePath, 'icon.jpg')
                    
                    if (fs.existsSync(iconPath)) {
                        const fileUrl = `file://${iconPath.replace(/\\/g, '/')}`
                        const writeIcon = await confirmAsPromise(
                            '确定修改?',
                            `确认后将${iconPath}写入d5a文件中<br><img src="${fileUrl}" alt="缩略图预览" style="max-width: 200px; max-height: 200px;">`
                        )
                        if (writeIcon) {
                            try {
                                await addFileToZip(asset.path, iconPath, 'icon.jpg')
                                console.log(`成功将缩略图${iconPath}写入 ${asset.path}`)
                            } catch (error) {
                                console.error(`写入缩略图到 ${asset.path} 失败:`, error)
                            }
                        }
                    }
                }
            }
        }
    }
}
export const 上传缩略图 = (assets) => {
    return {
        'label': '上传缩略图',
        'click': () => {
            assets.forEach(asset => {
                    // 创建文件输入元素
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    
                    fileInput.onchange = (event) => {
                        const file = event.target.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('image', file);
                            formData.append('assetPath', asset.path);

                            let url = thumbnail.upload(asset.type, asset.path);
                            fetch(url, {
                                method: 'POST',
                                body: formData
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log('缩略图上传成功:', data);
                            })
                            .catch(error => {
                                console.error('缩略图上传失败:', error);
                            });
                        }
                    };

                    // 触发文件选择对话框
                    fileInput.click();
                
            });
        }
    }
}
export const 从剪贴板上传缩略图 = (assets) => {
    return {
        'label': '从剪贴板上传缩略图',
        'click': () => {
            assets.forEach(asset => {
                navigator.clipboard.read()
                    .then(clipboardItems => {
                        for (const clipboardItem of clipboardItems) {
                            if (clipboardItem.types.includes('image/png') || clipboardItem.types.includes('image/jpeg')) {
                                clipboardItem.getType('image/png')
                                    .then(blob => {
                                        const formData = new FormData();
                                        formData.append('image', blob, 'clipboard_image.png');
                                        formData.append('assetPath', asset.path);

                                        let url = thumbnail.upload(asset.type, asset.path);
                                        fetch(url, {
                                            method: 'POST',
                                            body: formData
                                        })
                                        .then(response => response.json())
                                        .then(data => {
                                            console.log('剪贴板缩略图上传成功:', data);
                                        })
                                        .catch(error => {
                                            console.error('剪贴板缩略图上传失败:', error);
                                        });
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