const fs = require('fs')
export function asyncReadFile(path){
    return new Promise((resolve,reject)=>{
        /*setTimeout(
            resolve(null),1000
        )*/
        fs.readFile(path,(err,data)=>{
            if(err){
                console.error(err)
                resolve(null)
            }
            resolve(data)
        })
    
    })
}
