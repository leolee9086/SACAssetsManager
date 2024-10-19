import { 获取本地文件夹数据,获取标签列表数据,获取颜色查询数据, 处理默认数据} from "./siyuanAssets.js";
import { parseEfuContentFromFile,searchByEverything } from "../utils/thirdParty/everything.js";
import { performSearch as searchByAnytxt } from "../UI/components/localApi/anytxt/anytext.js";
export const fetchGridData = async(appData,附件数据源数组,$realGlob,signal, callBack, filterFunc,filListProvided={value:[]},search={value:''})=>{
    附件数据源数组.value.data = []
    const originalPush = 附件数据源数组.value.data.push;
    const uniqueExtensions = new Set();
    附件数据源数组.value.data.push = function (...args) {
        // 遍历每个传入的项,获取扩展名
        // 由于插件自身的本地文件夹遍历函数是通过接口直接获取扩展名,所以并不需要这个过程
        if (!appData.value.tab.data.localPath) {
            args.forEach(arg => {
                if (arg && arg.path && arg.path.indexOf('.') >= 0) {
                    const fileExtension = arg.path.split('.').pop().toLowerCase();
                    if (arg.type === 'note') {
                        uniqueExtensions.add('note');
                    } else {
                        uniqueExtensions.add(fileExtension);
                    }
                }
            });
            extensions.value = Array.from(uniqueExtensions);
        }
        // 调用原始的 push 方法
        const filteredArgs = args.filter(arg => filterFunc(arg));
        if (filteredArgs.length > 0) {
            originalPush.apply(this, filteredArgs);
        }
        return true
    };
    try {
      
     
        if (filListProvided.value) {
            附件数据源数组.value.data.push(...filListProvided.value);
        }
      
        else if (appData.value.tab.data.efuPath) {
            let data
            try {
                data = await parseEfuContentFromFile(appData.value.tab.data.efuPath)
                附件数据源数组.value.data.push(...data);
                callBack()
            } catch (e) {
                data = []
            } finally {
                callBack()
            }
        }
        //提供了本地文件夹路径
        else if (appData.value.tab.data.localPath) {
            await 获取本地文件夹数据($realGlob.value, 附件数据源数组.value.data, callBack, 1, signal)
        }
        //提供了标签
        else if (appData.value.tab.data.tagLabel) {
            await 获取标签列表数据(appData.value.tab.data.tagLabel, 附件数据源数组.value.data, callBack, 1, signal, $realGlob.value)
        }
        else if (appData.value.tab.data.color) {
            await 获取颜色查询数据(appData.value.tab.data.color, 附件数据源数组.value.data, callBack, 1, signal, $realGlob.value)
        }
        else if (appData.value.tab.data.everythingApiLocation) {
            const url = new URL(appData.value.tab.data.everythingApiLocation)
            const { enabled, fileList } = await searchByEverything(search.value, url.port, { count: 10240 });
            if (enabled) {
                everthingEnabled.value = true;
                附件数据源数组.value.data.push(...fileList);
            } else {
                everthingEnabled.value = false;
            }
        }
        else if (appData.value.tab.data.anytxtApiLocation) {
            const url = new URL(appData.value.tab.data.anytxtApiLocation)
            const fileList = await searchByAnytxt(search.value, url.port, { count: 10240 });
            if (fileList) {
                everthingEnabled.value = true;
                附件数据源数组.value.data.push(...fileList);
            } else {
                everthingEnabled.value = false;
            }
        }
        else {
            await 处理默认数据(appData.value.tab, 附件数据源数组.value.data, async () => {
                //支持file链接
                if (appData.value.tab.data.block_id) {
                    let files = await 获取文档中的文件链接(appData.value.tab.data.block_id)
                    获取本地文件列表数据(files, 附件数据源数组.value.data, callBack, 1, signal)
                    return
                }
                callBack()
            })
        }
        callBack()
    } catch (e) {
        console.warn(e)
    }
}