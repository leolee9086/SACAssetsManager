function createURL(url) {
    try {
        return new URL(url);
    } catch(e) {
        console.error('解析url失败', 'url', url, e);
        return null;
    }
}

function isSameURL(url1, url2) {
    try {
        const $url1 = createURL(url1);
        const $url2 = createURL(url2);
        
        if (!$url1 || !$url2) return false;
        
        // 注意浏览器会自动将url中的路径解析到index.html
        // 所以需要将路径中的index.html去掉
        const path1 = $url1.pathname.replace(/index\.html$/, '');
        const path2 = $url2.pathname.replace(/index\.html$/, '');
        
        // 比较 pathname、hostname 和 search
        return path1 === path2 && 
               $url1.hostname === $url2.hostname && 
               $url1.search === $url2.search;
    } catch(e) {
        console.error('比较url失败', e);
        return false;
    }
}

export function 获取同源窗口(url) {
    const { BrowserWindow } = require('@electron/remote');
    
    // 过滤掉已销毁的窗口，并确保URL比较的准确性
    return BrowserWindow.getAllWindows().filter(win => {
        try {
            if (!win || win.isDestroyed()) return false;
            
            const winUrl = win.webContents.getURL();
            if (!winUrl) return false;
            
            return isSameURL(winUrl, url);
        } catch(e) {
            console.error('获取窗口URL失败', e);
            return false;
        }
    });
}