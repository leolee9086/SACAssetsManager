const fs = require('fs')
export function asyncReadFile(path){
    return new Promise((resolve,reject)=>{
        setTimeout(
            resolve(null),500
        )
        fs.readFile(path,(err,data)=>{
            if(err){
                resolve(null)
            }
            resolve(data)
        })
    
    })
}
