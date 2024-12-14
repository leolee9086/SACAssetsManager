import { confirm } from "../runtime.js";
export const confirmAsPromise=(标题,主体内容)=>{
    return new Promise((resolve, reject) => {
        confirm(
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