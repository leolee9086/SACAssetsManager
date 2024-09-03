const numberParser = (value) => {
    const num = Number(value)
    if (isNaN(num)) {
        return 0
    }
    return num
}
const dateParser = (value) => {
    const date = new Date(value)
    return date.toLocaleString()
}
const thumbnailParser = (value) => {
    if (typeof value === 'string') {
        return value
    }
    if (value instanceof Buffer) {
        const blob = new Blob([value], { type: 'image/png' })
        return blob
    }
    if (value instanceof ArrayBuffer) {
        const blob = new Blob([value], { type: 'image/png' })
        return blob
    }
    if (value instanceof Base64) {
        const blob = new Blob([value], { type: 'image/png' })
        return blob
    }
}
export const 文件系统内部属性表 = {
    name: {
        readOnly: false,
        type: 'string',
        required: true,
        description: '文件名',
        label: '文件名',
        setter: (value,path) => {
            require('fs').renameSync(path, value)
        },
        setterTimeOut: 1000,
        show: true
    },
    size: {
        readOnly: true,
        type: 'number',
        default: 0,
        show: true,
        label: '文件大小',
        parser: (value) => {
            //按照类似资源管理器的格式显示文件大小
            let numValue = Number(value)
            if(numValue < 1024){
                return numValue + '字节'
            }
            if(numValue < 1024 * 1024){
                return (numValue / 1024).toFixed(2) + 'KB'
            }
            if(numValue < 1024 * 1024 * 1024){
                return (numValue / 1024 / 1024).toFixed(2) + 'MB'
            }
            return (numValue / 1024 / 1024 / 1024).toFixed(2) + 'GB'
        }
    },
    type: {
        type: 'string',
        default: ''
    },
    path: {
        type: 'string',
        default: '',
        required: true,
        description: '文件路径',
        label: '文件路径'
    },
    ctime: {
        type: 'string',
        default: 0,
        description: '创建时间',
        label: '创建时间',
        show: false
    },
    mtime: {
        type: 'string',
        default: 0,
        description: '修改时间',
        label: '修改时间',
        show: false
    },
    id: {
        type: 'string',
        default: '',
        required: true,
        description: '文件id',
        label: '文件id',
        show: false
    },
    birthtime: {
        type: 'string',
        default: 0,
        description: '创建时间',
        label: '创建时间',
        show: false
    },
    atime: {
        type: 'string',
        default: 0,
        description: '最近访问时间',
        label: '最近访问时间',
        show: true
    },
    birthtimeMs: {
        type: 'number',
        default: 0,
        description: '创建时间',
        label: '创建时间',
        show: true,
        parser: dateParser
    },
    mode: {
        type: 'number',
        default: 0,
        description: '文件权限',
        label: '文件权限',
        show: false
    },
    ctimeMs: {
        type: 'number',
        default: 0,
        description: '创建时间',
        label: '创建时间',
        show: true,
        parser: dateParser
    },
    mtimeMs: {
        type: 'number',
        default: 0,
        description: '修改时间',
        label: '修改时间',
        show: true,
        parser: dateParser
    },
    atimeMs: {
        type: 'number',
        default: 0,
        description: '最近访问时间',
        label: '最近访问时间',
        show: true,
        parser: dateParser
    },
    thumbnail: {
        required: true,
        type: 'string,buffer,arraybuffer,base64,object',
        default: '',
        description: '缩略图',
        label: '缩略图',
        parser: thumbnailParser
    }
}

