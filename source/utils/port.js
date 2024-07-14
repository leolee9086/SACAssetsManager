import {  Constants } from "../asyncModules.js";
import fs from '../polyfills/fs.js'
// 创建测试服务
function 创建测试服务() {
    let http = window.require("http");
    return http.createServer();
}

// 检查端口是否已被使用
async function 检查端口是否已被使用(端口号) {
    let 端口记录内容 = await 读取端口记录();
    return Object.keys(端口记录内容).find((k) => 端口记录内容[k] == 端口号);
}
export const 校验端口号格式 = (端口号) => {
    // 检查端口号的类型
    if (typeof 端口号 !== 'number') {
        throw new Error('端口号必须是一个数字');
    }
    // 检查端口号的范围
    if (端口号 < 0 || 端口号 > 65535) {
        throw new Error('端口号必须在0到65535之间');
    }
}
// 获取可用端口号
export const 获取可用端口号 = async (端口号) => {
    校验端口号格式(端口号)
    return new Promise(async (resolve, reject) => {
        let 测试服务 = 创建测试服务();
        let 可用端口号 = 端口号 || parseInt(window.location.port);
        if (await 检查端口是否已被使用(可用端口号)) {
            resolve(await 获取可用端口号(可用端口号 + 1));
            return;
        }
        测试服务.on("listening", () => {
            测试服务.close(() => {
                resolve(可用端口号);
            });
        });
        测试服务.on("error", async (error) => {
            if (error.code === "EADDRINUSE") {
                resolve(await 获取可用端口号(可用端口号 + 1));
            } else {
                reject(error);
            }
        });
        测试服务.listen(端口号);
    });
}
export const 获取思源核心服务端口号 = async () => {
    if (window.siyuan) {
        return parseInt(window.location.port)
    }
}
export const 读取端口记录 = async () => {
    let json={}
    if(await fs.exists(Constants.Port_Internal_Path)){
     json = JSON.parse(await fs.readFile(Constants.Port_Internal_Path))
    }else{
        
    }
    return json
}
export const 写入端口记录 = async (记录名, 记录值)=>{
    let json = {};
    if (await fs.exists(Constants.Port_Internal_Path)) {
      json = JSON.parse(await fs.readFile(Constants.Port_Internal_Path));
    }
    json[记录名] = 记录值;
    await fs.writeFile(
        Constants.Port_Internal_Path,

      JSON.stringify(json, undefined, 2)
    );
}
export const 获取插件服务端口号 = async (插件名,预期端口号) => {
    let 端口记录内容 = await 读取端口记录();
    let 插件端口号 = 预期端口号||端口记录内容[插件名];
    if (!插件端口号) {
        // Generate a random port number in the range 1024 to 65535
        插件端口号 = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        // Write the new port number to the records
        await 写入端口记录(插件名, 插件端口号);
    }
    return 插件端口号;
}