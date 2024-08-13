async function getMeta(ctx) {
    // 获取源文件地址
    const { 源文件地址 } = ctx.query.starts
}

class fileSysMetaPraser {
    constructor() {

    }
    match(sourceFilePath) {
        // 正则表达式匹配所有本地文件类型
        // 包括以 file:// 开头的 URL，以 / 开头的 UNIX 绝对路径
        // 以及以盘符和 \ 开头的 Windows 绝对路径
        var regex = /^(?:file:\/\/|[a-zA-Z]:\\|\/)/i; // i 标志使匹配不区分大小写
        return regex.test(sourceFilePath);
    }
    async parse(sourceFilePath){
        //解析文件属性,返回值必须符合schema
        const stat = fs.statSync(sourceFilePath);
        
        const {
            size,
            mtime,
            atime,
            birthtime,
            mode,
            uid,
            gid,
            dev,
            ino,
            nlink,
            rdev,
            blksize,
            blocks,
            isFile,
            isDirectory,
            isBlockDevice,
            isCharacterDevice,
            isSymbolicLink,
            isFIFO,
            isSocket
        } = stat;
        return {
            name:sourceFilePath,
            path:sourceFilePath,
            size:0,
            type:"",
            permissions:"",
        }
    }
    //一个jsonScheme,用于描述解析器返回的文件属性
    //解析函数返回的文件属性必须符合此Scheme
    //其中动态渲染的属性使用字符串声明,前端获取之后会进行渲染
    //校验时render属性会被忽略
    schema = {
        properties: {
            "name": {
                "type": "string",
                "description": "文件名"
            },
            "path": {
                "type": "string",
                "description": "文件的完整路径"
            },
            "size": {
                "type": "integer",
                "description": "文件大小（字节）",
                "minimum": 0
            },
            "createdTime": {
                "type": "string",
                "format": "date-time",
                "description": "文件创建时间"
            },
            "modifiedTime": {
                "type": "string",
                "format": "date-time",
                "description": "文件最后修改时间"
            },
            "accessTime": {
                "type": "string",
                "format": "date-time",
                "description": "文件最后访问时间"
            },
            "type": {
                "type": "string",
                "description": "文件类型（如：文本文件、图片文件等）"
            },
            "permissions": {
                "type": "string",
                "description": "文件权限（如：rw-r--r--）",
                //动态渲染属性
                //返回值只能是一个html字符串
                //声明方式是指定一个url,前端会调用此url获取渲染内容
                //body是请求参数,path是文件路径
                //可以使用模板字符串进行动态渲染
                //模板字符串中的${path}会被替换为实际的文件路径,
                //${path}可以出现在url和body中
                //${meta}是文件属性对象自身
                //可以通过它获取文件属性
                "render":{
                    url:"/api/meta/render",
                    method:"post",
                    body:{
                        path:"${path}",
                    }
                }
            },
        },
        "required": ["name", "path", "size", "createdTime", "modifiedTime", "accessTime", "type", "permissions"]
    }
}