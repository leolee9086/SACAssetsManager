import { plugin } from "../../pluginSymbolRegistry.js";
import { clientApi } from "../../asyncModules.js";

const {
    adaptHotkey,
    confirm,
    Constants,
    showMessage,
    fetchPost,
    fetchSyncPost,
    fetchGet,
    getFrontend,
    getBackend,
    getModelByDockType,
    openTab,
    openWindow,
    openMobileFileById,
    lockScreen,
    exitSiYuan,
    Protyle,
    Plugin,
    Dialog,
    Menu,
    Setting,
    getAllEditor,
    platformUtils
} = clientApi



const {
    app,
    i18n,
    eventBus,
    data,
    displayName,
    name,
    protyleSlash,
    customBlockRenders,
    topBarIcons,

    setting,

    statusBarIcons,
    commands,
    models,
    docks,
    protyleOptionsValue,


    onload,
    onunload,
    uninstall,
    updateCards,
    onLayoutReady,
    addCommand,
    addIcons,
    addTopBar,
    addStatusBar,
    openSetting,
    loadData,

    saveData,
    removeData,
    getOpenedTab,
    addTab,
    addDock,
    addFloatLayer,
    updateProtyleToolbar,
    protyleOptions,
} = plugin