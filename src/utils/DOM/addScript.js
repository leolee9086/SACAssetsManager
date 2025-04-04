import { addScriptSync, addScript } from "../../../src/toolBox/base/useBrowser/useDOM/useScripts.js";
import { echarts伺服路径, echartsGL伺服路径 } from "../../../src/toolBox/useAge/forSiyuan/useSiyuanPaths/useStage.js";
export const addEcharts = async () => {
    await addScript(echarts伺服路径, "protyleEchartsScript")
    await addScript(echartsGL伺服路径, "protyleEchartsGLScript")
}
export const addEchartsSync = () => {
    addScriptSync(echarts伺服路径, "protyleEchartsScript")
    addScriptSync(echartsGL伺服路径, "protyleEchartsGLScript")
}
export {addScript,addScriptSync}