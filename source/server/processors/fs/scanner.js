import { statWithCatch } from "./stat.js"

export async function sacnDuplicateFilesByPathArray(pathArray,options={
    needSameName:false,
}) {
    const fileArray = []
    for(const path of pathArray){
        const stat= await statWithCatch(path)
        if(stat.isFile()){
            fileArray.push(stat)
        }
    }
    const duplicateFiles = []
    for(let i = 0; i < fileArray.length; i++){
        for(let j = i + 1; j < fileArray.length; j++){
            if(compareFileLoosely(fileArray[i],fileArray[j])){
                duplicateFiles.push([fileArray[i],fileArray[j]])
            }
        }
    }
    for(let i = 0; i < duplicateFiles.length; i++){
       const [file1,file2] = duplicateFiles[i]
       if(!compareFileContent(file1,file2)){
        duplicateFiles.splice(i,1)
        i--
       }
    }
    return duplicateFiles
}

async function compareFileLoosely(file1,file2){
    //如果文件大小不同，则不用比较
    if(file1.size !== file2.size){
        return false
    }
    //构建10个采样点
    const samplePoints = []
    for(let i = 0; i < 10; i++){
        samplePoints.push(Math.floor(Math.random() * file1.size))
    }
    //读取采样点数据
    const sampleData1 = await readFileRandomlyOffset(file1,samplePoints[0],10)
    const sampleData2 = await readFileRandomlyOffset(file2,samplePoints[0],10)
    //比较采样点数据
    return sampleData1.toString() === sampleData2.toString()
    
}

/***
 * 不完全打开文件,从文件中随机读取offset偏移量开始,length长度的数据
 */

async function readFileRandomlyOffset(file,offset,length){
    
    const fileStream = fs.createReadStream(file.path,{
        start:offset,
        end:offset+length
    })
    const reader = fileStream.getReader()
    const result = await reader.read()
    return result.value
}