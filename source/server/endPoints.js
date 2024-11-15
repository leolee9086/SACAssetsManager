//这个文件是在前端调用的,注意这一点
import { plugin } from '../asyncModules.js'
import { imageExtensions } from '../server/processors/thumbnail/utils/lists.js'
import { 获取文档图标 } from '../utils/siyuanData/icon.js'

export const serverHost = () => `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
export const rawImageServerHost = () => `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号+1}`

//缩略图相关
const thumbnailHost = (type, path, size, data) => {
    if (type === 'note') {
        let meta = data.$meta
        return 获取文档图标(meta)
    }
    let src = !type ? `${serverHost()}/thumbnail/?path=${encodeURIComponent(path)}&size=${size}` : `${serverHost()}/thumbnail/?localPath=${encodeURIComponent(path)}&size=${size}`
    let rawSrc = !type ? `${rawImageServerHost()}/raw/?path=${encodeURIComponent(path)}` : `${rawImageServerHost()}/raw/?localPath=${encodeURIComponent(path)}`
    if (size > 200 && imageExtensions.includes(path.split('.').pop())) {
        return rawSrc
    } else {
        return src
    }
}
const upload = (type, path) => {
    let baseUrl = `${serverHost()}/thumbnail/upload`;
    let params = new URLSearchParams();

    if (!type) {
        params.append('path', path);
    } else {
        params.append('localPath', path);
    }

    return `${baseUrl}?${params.toString()}`;
}
export const fs = {
    path: {
        getPathExtensions(localPath) { return `${serverHost()}/fs/path/extentions/?dirPath=${encodeURIComponent(localPath)}` },
        getFolderThumbnail(localPath) {
            return `${serverHost()}/fs/path/folderThumbnail?dirPath=${encodeURIComponent(localPath)}`;
        }

    },
    disk: {
        listLocalDisks() { return `${serverHost()}/listDisk` }
    }
}

export const metadata = {
    exif: (localPath) => {
        let baseUrl = `${serverHost()}/metadata/exif`;
        let params = new URLSearchParams();
        params.append('localPath', localPath);
        return `${baseUrl}?${params.toString()}`;
    }
}

export const thumbnail = {
    genHref: thumbnailHost,
    getColor: (type, path, reGen = false) => {
        let baseUrl = `${serverHost()}/color/`;
        let params = new URLSearchParams();

        if (!type) {
            params.append('path', path);
        } else {
            params.append('localPath', path);
        }

        if (reGen) {
            params.append('reGen', 'true');
        }

        return `${baseUrl}?${params.toString()}`;
    },
    upload: upload
}
export const metaRecords = {
    deleteRecord: async (path) => {
        let baseUrl = `${serverHost()}/metaRecords/delete/`
        let params = new URLSearchParams();
        params.append('localPath', path);
        return await fetch(`${baseUrl}?${params.toString()}`)
    }
}

export function uploadThumbnail(asset, file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('assetPath', asset.path);
    let url = upload(asset.type, asset.path);
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
