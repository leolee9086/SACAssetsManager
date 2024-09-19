export const 思源软件图标URL= '/stage/icon-large.png'
import { kernelApi } from "../../asyncModules.js";
function createEmptySVGDataURL(cssString) {
    // 解析 CSS 字符串
    /*const styles = cssString.split(';').reduce((acc, style) => {
      const [key, value] = style.split(':').map(s => s.trim());
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});*/
  
    // 创建 SVG
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58">
      </svg>
    `;
  
    // 转换为 Data URL
    const dataURL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    
    return dataURL;
  }
  function createEmojiSVGDataURL(emojiUnicode) {
    const emoji = String.fromCodePoint(parseInt(emojiUnicode, 16));
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 48px; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
                    ${emoji}
                </div>
            </foreignObject>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export function 获取文档图标(id){
    const data = kernelApi.getDocInfo.sync({id})
    //有图标使用图标
    if(data.icon){
        if(data.icon.indexOf('.')>-1){
            return `/emojis/${data.icon}`   
        }else{
            return createEmojiSVGDataURL(data.icon)
        }
    }
    else if(
      data.ial['title-img']  
    ){
        //给一个空的svg地址方便使用css字符串
        if(!data.ial['title-img'].indexOf('url')){
            return createEmptySVGDataURL()
        }else{
            return data.ial['title-img'].replace('background-image:url("','').replace('")','')
        }
    }else{
        return 思源软件图标URL
    }
}