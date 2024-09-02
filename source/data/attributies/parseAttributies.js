const numberParser = (value) => {
    const num = Number(value)
    if (isNaN(num)) {
        return 0
    }
    return num
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
        setterTimeOut: 1000
    },
    size: {
        readOnly: true,
        type: 'number',
        default: 0
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
        label: '创建时间'
    },
    mtime: {
        type: 'string',
        default: 0,
        description: '修改时间',
        label: '修改时间'
    },
    id: {
        type: 'string',
        default: '',
        required: true,
        description: '文件id',
        label: '文件id',
    },
    ctimeMs: {
        type: 'number',
        default: 0,
        description: '创建时间的毫秒数',
        label: '创建时间的毫秒数',
        parser: numberParser
    },
    mtimeMs: {
        type: 'number',
        default: 0,
        description: '修改时间的毫秒数',
        label: '修改时间的毫秒数',
        parser: numberParser
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

