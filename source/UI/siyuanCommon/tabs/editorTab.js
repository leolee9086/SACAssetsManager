import { clientApi,plugin } from "../../../asyncModules.js";
const TabID = plugin.name + "EditorTab"
const app = plugin.app
export  const 打开编辑器面板 = (custom,options={}) => {
    clientApi.openTab({
        app: app,
        custom: { ...custom, id: TabID },
        ...options
    })
}