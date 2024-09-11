import {clientApi} from '../../asyncModules.js'
export const confirmAsPromise=(标题,主体内容)=>{
    return new Promise((resolve, reject) => {
        clientApi.confirm(
            标题,
            主体内容,
            ()=>{
                resolve(true)
            },
            ()=>{
                resolve(false)
            }
        );
    })
}