const fs = require('fs')
export function asyncReadFile(path){
    return new Promise((resolve,reject)=>{
        fs.readFile(path,(err,data)=>{
            if(err){
                resolve(null)
            }
            resolve(data)
        })
    })
}
