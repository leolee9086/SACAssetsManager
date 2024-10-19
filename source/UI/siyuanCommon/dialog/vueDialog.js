import { clientApi } from "../../../asyncModules.js";
import { initVueApp } from "../../utils/componentsLoader.js";
export function openDialog(appURL, name, mixinOptions = {}, directory, data,title,width,height,transparent=true) {
    const dialog = new clientApi.Dialog(
        {
            title: !title?"TEColors":title,
            content: `
            <div id="styleEditorPanel" 
                class='fn__flex-column styleEditor'  
                style="pointer-events:auto;z-index:5;max-height:80vh">
            </div>
`,
            width: width||'200px',
            height: height||'auto',
            transparent: transparent,
            disableClose: transparent,
            disableAnimation: false,
            
        }
    )
    data&&(data.$dialog=dialog);
    transparent?dialog.element.style.pointerEvents = 'none':dialog.element.style.pointerEvents = 'auto'
    transparent?dialog.element.querySelector(".b3-dialog__container").style.pointerEvents = 'auto':null
    dialog.element.querySelector(".b3-dialog__header").style.padding ='0px 24px'
    dialog.element.querySelector(".b3-dialog__header").insertAdjacentHTML('afterBegin',`<svg class="cc-dialog__close" style="position:absolute;top:2px;left:2px"><use xlink:href="#iconCloseRound"></use></svg>`)
    dialog.element.querySelector(".cc-dialog__close").addEventListener('click',()=>{dialog.destroy()})
    const app= initVueApp(appURL, name, mixinOptions = {}, directory, data)
    app.mount(dialog.element.querySelector(".styleEditor"))
    return {app,dialog}
}