import { clientApi,plugin } from "../../../asyncModules.js"
export const 根据块ID创建protyle = (element,id) => {
    return new clientApi.Protyle(
        plugin.app,
        element,
        {
            blockId: id,
            render: {
                breadcrumb: true,
                background: true,
                title: true
            }
        }
    )
}