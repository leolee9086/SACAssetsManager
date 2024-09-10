import { thumbnail } from "../../../../server/endPoints.js"
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