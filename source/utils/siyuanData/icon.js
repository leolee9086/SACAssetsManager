export const 思源软件图标URL = '/stage/icon-large.png'
import { kernelApi } from "../../asyncModules.js";
function createEmptySVGDataURL(cssString) {
  
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58">
      </svg>
    `;

    // 转换为 Data URL
    const dataURL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return dataURL;
}
function createCssStringSVGDataURL(string){
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="
                width: 58px; 
                height: 58px;
                ${string}
                ">
                </div>
            </foreignObject>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function createStringSVGDataURL(string,fontSize=5){
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="
                font-size: ${fontSize}px; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                width: 53px; 
                height: 53px;
                margin:3px  
                ">
                    ${string}
                </div>
            </foreignObject>
        </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function createEmojiSVGDataURL(emojiUnicode) {
    const emoji = String.fromCodePoint(parseInt(emojiUnicode, 16));
    return createStringSVGDataURL(emoji,48)
}

const infoCache= {}

export function 获取文档图标(block) {
    if (block.type === 'd') {
        let {id}=block
        const data =infoCache[id]|| kernelApi.getDocInfo.sync({ id })
        infoCache[id]= data
        //有图标使用图标
        if (data.icon) {
            if (data.icon.indexOf('.') > -1) {
                return `/emojis/${data.icon}`
            } else {
                return createEmojiSVGDataURL(data.icon)
            }
        }
        else if (
            data.ial['title-img']
        ) {
            //给一个空的svg地址方便使用css字符串
            if (data.ial['title-img'].indexOf('url')===-1) {
                return createCssStringSVGDataURL(data.ial['title-img'])
            } else {
                return data.ial['title-img'].replace('background-image:url("', '').replace('")', '')
            }
        }
    }else {
        return createStringSVGDataURL(block.content.slice(0,256))
    }
    return 思源软件图标URL
}
export const isSvg=(iconString)=>{
    return iconString&&iconString.startsWith('#')
}