import { plugin } from "../../../../asyncModules.js";
const 模式列表 = [
    { label: '移动', value: '移动' },
    { label: '插件', value: '插件' },
    { label: '常规', value: '常规' },
    { label: '编辑', value: '编辑' }
];
const 批处理模式 = { label: '批处理(实验性)', value: '批处理' };
export const 创建模式菜单 = (模式, event, assets, options) => ({
    label: 模式.label,
    click: () => {
        plugin.附件编辑模式 = 模式;
        setTimeout(() => plugin.打开附件组菜单(event, assets, options), 100);
    }
});
export const 模式切换菜单项 = (event, assets, options) => {
    const 基础菜单项 = {
        label: "切换模式",
        submenu: 模式列表.map(模式 => 创建模式菜单(模式, event, assets, options))
    };
    if (options.data.localPath) {
        基础菜单项.submenu.push(
            创建模式菜单(批处理模式, event, assets, options)
        );
    }
    return 基础菜单项;
};
