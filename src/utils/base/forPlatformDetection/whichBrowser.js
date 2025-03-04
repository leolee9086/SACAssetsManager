/**
 * 浏览器类型检测
 */
export const 获取浏览器信息 = () => {
    const userAgent = typeof window !== 'undefined' ? 
        window.navigator.userAgent.toLowerCase() : '';
    
    return {
        是否Chrome: /chrome/.test(userAgent) && !/edge|opr/.test(userAgent),
        是否Firefox: /firefox/.test(userAgent),
        是否Safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
        是否Edge: /edg/.test(userAgent),
        是否Opera: /opr/.test(userAgent) || /opera/.test(userAgent),
        是否IE: /trident/.test(userAgent)
    };
}; 