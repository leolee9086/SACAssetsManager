/**
* 使用 OpenAI API 同步翻译文本
* 
* @param {string} 文本 - 需要翻译的原文
* @param {string} 目标语言 - 翻译的目标语言
* @param {Object} 接口配置 - OpenAI API 的配置信息
* @param {string} 接口配置.模型 - 使用的 OpenAI 模型名称
* @param {string} 接口配置.API地址 - OpenAI API 的 URL
* @param {Object} 接口配置.请求头 - API 请求的头部信息
* @returns {string} 翻译后的文本，如果翻译失败则返回原文
* @throws {Error} 当 API 请求失败时抛出错误
*/
export const 同步调用openAI翻译 = (文本, 目标语言, 接口配置) => {
    try {
        const 请求体 = JSON.stringify({
            model: 接口配置.模型,
            messages: [
                { role: "system", content: `你是一个翻译助手。请将以下文本翻译成${目标语言}。` },
                { role: "user", content: 文本 }
            ]
        });

        const 请求 = new XMLHttpRequest();
        请求.open('POST', 接口配置.API地址, false);
        Object.entries(接口配置.请求头).forEach(([键, 值]) => 请求.setRequestHeader(键, 值));
        请求.send(请求体);
        if (请求.status === 200) {
            const 响应 = JSON.parse(请求.responseText);
            return 响应.choices[0].message.content.trim();
        } else {
            throw new Error(`API请求失败: ${请求.status} ${请求.statusText}`);
        }
    } catch (错误) {
        console.error('翻译过程中发生错误:', 错误);
        return 文本; // 出错时返回原文
    }
};

// 导入AI配置适配器
import { forTranslationConfig } from '../../../src/toolBox/useAge/forSiyuan/forAI/forLegacyCode.js';

/**
* 使用思源配置同步调用 AI 翻译
* 
* @param {string} 文本 - 需要翻译的原文
* @param {string} 目标语言 - 翻译的目标语言
* @returns {string} 翻译后的文本，如果翻译失败则返回原文
* @throws {Error} 当 API 请求失败时抛出错误
*/
export const 同步调用思源配置翻译 = (文本) => {
    const 接口配置 = forTranslationConfig();
    return 同步调用openAI翻译(文本, 接口配置.目标语言, 接口配置);
};

export const 创建AI翻译标签函数 = (目标语言, 接口配置) => {
    return function (字符串数组, ...插值) {
        // 构建完整的模板字符串
        let 完整模板 = '';
        字符串数组.forEach((字符串, 索引) => {
            完整模板 += 字符串;
            if (索引 < 插值.length) {
                完整模板 += `__VAR_${索引}__`;
            }
        });

        try {
            const 请求体 = JSON.stringify({
                model: 接口配置.模型,
                messages: [
                    { role: "system", content: `
                        你是一个翻译助手。
                        翻译助手的工作是收到任何内容时,仅仅准确地将文本翻译成${目标语言}。
                        保持 __VAR_XXX__ 格式的特殊标记不变，这些是变量占位符。
                        原始文本与目标语言一样时，直接回复原始文本
                        除此之外翻译助手任何时候都不应当回应任何其他内容，也不应当对翻译文本做任何其他改动。
                        ` },
                    { role: "user", content: 完整模板 }
                ]
            });

            const 请求 = new XMLHttpRequest();
            请求.open('POST', 接口配置.API地址, false);
            Object.entries(接口配置.请求头).forEach(([键, 值]) => 请求.setRequestHeader(键, 值));
            请求.send(请求体);

            if (请求.status === 200) {
                const 响应 = JSON.parse(请求.responseText);
                let 翻译结果 = 响应.choices[0].message.content.trim();
                let 替换结果 = 翻译结果
                // 将翻译结果中的占位符替换为实际的插值
                插值.forEach((值, 索引) => {
                    替换结果 = 替换结果.replace(`__VAR_${索引}__`, 值);
                });
                
                return {
                    result:替换结果,
                    template:翻译结果
                };
            } else {
                throw new Error(`API请求失败: ${请求.status} ${请求.statusText}`);
            }
        } catch (错误) {
            console.error('翻译过程中发生错误:', 错误);
            // 出错时返回原始模板字符串的插值结果
            return 字符串数组.reduce((结果, 字符串, 索引) => 
                结果 + 字符串 + (插值[索引] || ''), '');
        }
    };
};

export const 创建思源配置AI翻译标签函数 = (目标语言= window.siyuan.config.lang) => {
    const 接口配置 = forTranslationConfig(目标语言);
    return 创建AI翻译标签函数(目标语言, 接口配置);
};


export const 创建可选AI翻译标签函数 = ( 启用翻译 =()=> true,目标语言 = window.siyuan.config.lang) => {
    const 接口配置 = forTranslationConfig(目标语言);
    const AI翻译标签函数 = 创建AI翻译标签函数(目标语言, 接口配置);
    return function (字符串数组, ...插值) {
        if (启用翻译()) {
            return AI翻译标签函数(字符串数组, ...插值);
        } else {
            // 直接使用原始的模板字符串
            return 字符串数组.reduce((结果, 字符串, 索引) => 
                结果 + 字符串 + (插值[索引] || ''), '');
        }
    };
};