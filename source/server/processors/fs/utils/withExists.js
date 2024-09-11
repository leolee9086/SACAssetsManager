const fs = require('fs')
/*
 * 
 */
export function asyncReadFile(path,  noError,timeout) {
    return new Promise((resolve, reject) => {
        if (timeout) {
            setTimeout(
                resolve(null), timeout
            )
        }
        fs.readFile(path, (err, data) => {
            if (err) {
                !noError && console.error(err)
                resolve(null)
            }
            resolve(data)
        })

    })
}
