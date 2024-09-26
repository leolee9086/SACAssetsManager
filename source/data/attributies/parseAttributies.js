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
        setter: (value, path) => {
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
            if (numValue < 1024) {
                return numValue + '字节'
            }
            if (numValue < 1024 * 1024) {
                return (numValue / 1024).toFixed(2) + 'KB'
            }
            if (numValue < 1024 * 1024 * 1024) {
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

export function 解析文件内部属性显示(属性名, 属性值) {
    let result = 属性值
    try {
        let 解析器定义 = 文件系统内部属性表[属性名]
        if (解析器定义) {
            if (解析器定义.parser) {
                result = 解析器定义.parser(属性值)
            }
        }
    } catch (e) {
        console.warn(e)
    }
    return result
}
export function 解析文件属性数组内部属性显示(属性名, 属性数组) {
    if (属性数组.length === 1) {
        return 解析文件内部属性显示(属性名, 属性数组[0][属性名]);
    } else {
        // 检查数组中所有元素的指定属性是否一致
        const firstValue = 属性数组[0][属性名];
        let allSame = true;
        for (let i = 1; i < 属性数组.length; i++) {
            if (属性数组[i][属性名] !== firstValue) {
                allSame = false;
                break;
            }
        }
        // 如果全部一致，返回值；否则返回 "多种"
        return allSame ? 解析文件内部属性显示(属性名, firstValue) : "多种";
    }
}
export function 解析文件属性名标签(属性名){
    return (文件系统内部属性表[属性名]&&文件系统内部属性表[属性名].label)||属性名
}
/**
 * 获取要显示的数据属性
 * @param {Object} data - 文件数据对象
 * @returns {string[]} 过滤后的属性键数组
 */
export function 获取属性显示定义(排除属性列表,文件系统内部属性表,data) {
    // 需要排除的属性列表
    
    return Object.keys(data).filter(key => {
      // 排除特定属性
      if (排除属性列表.includes(key)) {
        return false;
      }
      
      // 检查属性是否应该显示
      const attributeInfo = 文件系统内部属性表[key];
      return attributeInfo ? attributeInfo.show : true;
    });
  }
  