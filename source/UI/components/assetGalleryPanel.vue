<template>
    <div @wheel.ctrl.stop.prevent="(event) => { size = 从滚轮事件计算(size, event, 1024, 32) }" class=" fn__flex-column"
        style="max-height: 100%;" ref="root">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1">
            </div>
            <div class=" fn__flex ">
                <div class="fn__space fn__flex-1"></div>
                <span>
                    <svg v-if="() => appData.value.tab.data.everythingApiLocation ? true : false"
                        class="icon-green icon-overlay" :style="{
                            width: '20px',
                            height: '20px',
                            color: everthingEnabled ? 'rgb(253, 128, 0)' : 'red'
                        }
                            ">
                        <use xlink:href="#iconSearch"></use>
                    </svg>
                </span>
                <input v-model="size" style="box-sizing: border-box;width: 200px;" :value="200"
                    class="b3-slider fn__block" max="1024" min="32" step="16" type="range">
                <div class="fn__space fn__flex-1"></div>
                <input v-if="!everthingEnabled" v-model="maxCount" style="box-sizing: border-box;width:100px;"
                    :value="1000" type="number">
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex">
                    <button @click="refreshPanel">{{ plugin.翻译`刷新` }}</button>
                </div>
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex">
                    <input v-model="rawSearch" style="box-sizing: border-box;width:100px;">
                </div>
                <div class="fn__space fn__flex-1"></div>

                <div class="fn__flex" style="margin:auto">
                    <button @click.right.stop.prevent="() => { filterColor = []; refreshPanel() }" ref="palletButton"
                        @click.left="showPallet = !showPallet"
                        :style="{ padding: 0, margin: 0, width: 24 + 'px', height: 24 + 'px', backgroundColor: filterColor.length ? `rgb(${filterColor.join(',')})` : '' }">
                        <svg style="width:24px;height:24px;">
                            <use xlink:href="#iconColorPannel"></use>
                        </svg>
                    </button>
                </div>

                <div class="fn__flex">
                    <button v-if="eaglePath" @click="获取eagle标签列表">导入eagle中的tag</button>
                </div>

                <div class="grid__container" v-if="showPallet"
                    :style="`position:absolute;top:${palletButton.offsetTop + palletButton.offsetHeight + 10}px;left:${palletButton.offsetLeft - 100}px;width:200px;max-height:300px;background:var(--b3-menu-background);height:300px;overflow:auto;z-index:10;`">
                    <template v-for="item in pallet">
                        <div @click.left="() => { filterColor = item; showPallet = false; refreshPanel() }"
                            :style="{ backgroundColor: `rgb(${item[0]},${item[1]},${item[2]})`, height: 36 + 'px', width: 36 + 'px', display: 'inline-block', margin: '0 2px' }">
                        </div>
                    </template>
                </div>
                <div class="fn__space fn__flex-1"></div>

                <div>
                    <multiple v-model="selectedExtensions" :options="extensions"></multiple>
                </div>
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <commonBreadCrumb @globChange="(e) => globSetting = e"></commonBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space"></div>
        <div class="fn__flex-column fn__flex-1" @dragstart.stop="(e) => onDragStart(e, currentLayout)"
            style="width:100%;overflow: hidden;" @mousedown.left="startSelection" @click.left="endSelection"
            @click.right.stop="openMenu" @mousedup="endSelection" @mousemove="updateSelection" @drop="handlerDrop"
            @dragover.prevent>
            <assetsGridRbush @ready="创建回调并获取数据" ref="grid" :assetsSource="附件数据源数组" @palletAdded="palletAdded"
                :globSetting="$realGlob" v-if="showPanel && globSetting" :maxCount="maxCount"
                @layoutCountTotal="(e) => { layoutCountTotal = e }" @layoutChange="handlerLayoutChange"
                @scrollTopChange="handlerScrollTopChange" :sorter="sorter"
                @layoutCount="(e) => { layoutCount.found = e }" :filterColor="filterColor"
                @paddingChange="(e) => paddingLR = e" @layoutLoadedCount="(e) => { layoutCount.loaded = e }"
                :size="parseInt(size)">
            </assetsGridRbush>
            <div class="assetsStatusBar" style="min-height: 18px;">{{
                (layoutCountTotal + '个文件已遍历') + (layoutCount.found + layoutCount.loaded) + '个文件发现,' + layoutCount.loaded
                +
                '个文件已经加载' }}</div>
            <!--选择框的容器-->
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>
        </div>
    </div>
</template>
<script setup>
import { 获取本地文件夹数据, 获取标签列表数据, 获取颜色查询数据, 处理默认数据, 获取文档中的文件链接, 获取本地文件列表数据 } from "../../data/siyuanAssets.js"
import { ref, inject, computed, nextTick, watch, toRef, onMounted } from 'vue'
import assetsGridRbush from './galleryPanel/assetsGridRbush.vue';
import { plugin } from 'runtime'
import _path from '../../polyfills/path.js'
import * as endPoints from '../../server/endPoints.js'
import { addUniquePalletColors } from '../../utils/color/filter.js';
import multiple from "./common/selection/multiple.vue";
import { shiftWithFilter } from "../../utils/array/walk.js";
import { 柯里化 } from "../../utils/functions/currying.js";
/**
 * 监听相关事件刷新面板
 */
 plugin.eventBus.on('need-refresh-gallery-panel',(e)=>{
    const { type, data } = e.detail;
    if (type === 'tag') {
        appData.value.tab.data.tagLabel?refreshPanel():null;
    }

 })

/**
 * 获取数据相关
 */
const 附件数据源数组 = shallowRef({ data: [] })
const grid = ref(null)
let controller = new AbortController();
let signal = controller.signal;
import { parseEfuContentFromFile, searchByEverything } from '../../utils/thirdParty/everything.js';
import { performSearch as searchByAnytxt } from "./localApi/anytxt/anytext.js";
const everthingEnabled = ref(false)
const filListProvided = ref(null)
let filterFunc = () => {
    return true
}

const 创建回调并获取数据 = async () => {
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
        const callBack = (...args) => {
            grid.value && grid.value.dataCallBack ? grid.value.dataCallBack(...args) : null

        }
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
                nextTick(callBack)
            })
        }
        nextTick(callBack)
    } catch (e) {
        console.warn(e)
    }
}
const showPanel = ref(true)
const refreshPanel = () => {
    controller.abort()
    controller = new AbortController();
    signal = controller.signal
    showPanel.value = false
    layoutCount.found = 0
    layoutCount.loaded = 0
    layoutCountTotal.value = 0
    nextTick(() => {
        showPanel.value = true
    })
}
/**
 * 获取扩展名列表相关逻辑
 */
const extensions = ref([])
const selectedExtensions = ref([])
onMounted(() => {
    if (appData.value.tab.data.localPath) {
        const url = endPoints.fs.path.getPathExtensions(appData.value.tab.data.localPath)
        fetch(url).then(
            res => res.json()
        ).then(
            data => {
                data.extensions.forEach(extension => extensions.value.push(extension))
            }
        )
    }
})
watch(selectedExtensions, (newValue, oldValue) => {

    // 更新过滤函数以支持扩展名过滤
    filterFunc = (item) => {
        // 如果没有选择任何扩展名，则不过滤
        if (newValue.length === 0) {
            return true;
        }
        console.log(item)
        // 获取文件的扩展名
        if (item.type !== 'note') {
            const fileExtension = item.name.split('.').pop().toLowerCase();

            // 检查文件的扩展名是否在选中的扩展名列表中
            return newValue.includes(fileExtension)
        } else {
            return newValue.includes('note')
        }
    };

    refreshPanel();
    // 在这里可以添加其他逻辑，比如更新界面或触发其他操作
});


/**
 * 遍历选项相关逻辑
 */
//全局设置
const globSetting = ref({})
//最大显示数量
const maxCount = ref(1000)
const search = ref('');
const $realGlob = computed(() => {
    let realGlob = {
        ...globSetting.value,
        timeout: maxCount.value,
    }
    if (search.value) {
        realGlob.search = search.value
    }
    if (selectedExtensions.value[0]) {
        realGlob.extensions = selectedExtensions.value
    }
    return realGlob
})
watch(
    () => $realGlob.value, () => {
        refreshPanel()
    }
)


/**
 * 缩放相关
 */
import { 从滚轮事件计算 } from '../utils/scroll.js';
const appData = toRef(inject('appData'))
const layoutCountTotal = ref(0)
const rawSearch = ref('');
const paddingLR = ref(100)

let searchTimer = null;

watch(rawSearch, (data) => {
    // 每次 rawSearch 变化时，清除之前的定时器
    clearTimeout(searchTimer);
    // 设置一个新的定时器
    searchTimer = setTimeout(() => {
        // 半秒钟后，如果 rawSearch 没有变化，则更新 search 并触发搜索
        search.value = data;
    }, 500); // 500 毫秒后执行搜索
});

const palletButton = ref(null)
const showPallet = ref(false)
const pallet = ref([])
const filterColor = ref(appData.value.tab.data.color || [])
const eaglePath = ref('')
watch(
    filterColor, (data) => {
        plugin.eventBus.emit(
            'click-galleryColor',
            filterColor.value,
        )
    }
)
const palletAdded = (data) => {
    const newColors = data.map(item => item.color);
    pallet.value = addUniquePalletColors(pallet.value, newColors);

}


//缩略图大小
const size = ref(250)
//最大显示数量
const root = ref('null')
const layoutCount = reactive({ found: 0, loaded: 0 })
let currentLayout = reactive({})
let currentLayoutOffsetTop = 0
let currentLayoutContainer

const handlerLayoutChange = (data) => {
    currentLayout.value = data.layout || {}
    currentLayoutContainer = data.element
}

const handlerScrollTopChange = (scrollTop) => {
    currentLayoutOffsetTop = scrollTop
}

const 获取eagle标签列表 = () => {
    fetch(`http://localhost:${plugin.http服务端口号}/eagle-tags?path=${eaglePath.value}`).then(res => res.json()).then(json => {
        console.log(json)
    })
}
const 获取ealge素材库路径 = () => {
    fetch(`http://localhost:${plugin.http服务端口号}/eagle-path?path=${appData.value.tab.data.localPath}`).then(res => res.json()).then(json => {
        eaglePath.value = json.finded
    })
}
onMounted(() => {
    获取ealge素材库路径()
})


/**
 * 键盘相关逻辑
 */
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});
import { clearSelectionWithLayout, diffByEventKey, handleMultiSelection } from '../utils/selection.js'

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        clearSelectionWithLayout(currentLayout.value)
    }
}
/***
* 选择相关逻辑
*/
import { calculateSelectionCoordinates, updateSelectionStatus } from '../utils/selection.js'
const isSelecting = ref(false);
const selectionBox = ref({ startX: 0, startY: 0, endX: 0, endY: 0 });
const selectedItems = ref([])
const previousSelectedItem = ref([])
const startSelection = (event) => {
    if (isSelecting.value) {
        endSelection(event)
        return
    }
    isSelecting.value = true;
    selectionBox.value.startX = event.x;
    selectionBox.value.startY = event.y;
    selectionBox.value.endX = event.x;
    selectionBox.value.endY = event.y;
    if (event.ctrlKey || event.shiftKey || event.altKey) {
        previousSelectedItem.value = selectedItems.value
    }
};

const updateSelection = (event) => {
    if (isSelecting.value) {
        selectionBox.value.endX = event.x;
        selectionBox.value.endY = event.y;
        const galleryContainer = root.value.querySelector('.gallery_container');
        const layoutRect = galleryContainer.getBoundingClientRect();
        const coordinates = calculateSelectionCoordinates(selectionBox.value, layoutRect, currentLayoutOffsetTop, paddingLR.value, size.value)
        selectedItems.value = handleMultiSelection(currentLayout.value, coordinates, size.value < 表格视图阈值)
        selectedItems.value = diffByEventKey(previousSelectedItem.value, selectedItems.value, event)
        clearSelectionWithLayout(currentLayout.value)
        updateSelectionStatus(selectedItems.value, event)
    }
};

const endSelection = (event) => {
    isSelecting.value = false;
    selectionBox.value.endX = event.x;
    selectionBox.value.endY = event.y;
    const galleryContainer = root.value.querySelector('.gallery_container');
    const layoutRect = galleryContainer.getBoundingClientRect();
    const coordinates = calculateSelectionCoordinates(selectionBox.value, layoutRect, currentLayoutOffsetTop, paddingLR.value, size.value)
    selectedItems.value = handleMultiSelection(currentLayout.value, coordinates, size.value < 表格视图阈值)
    selectedItems.value = diffByEventKey(previousSelectedItem.value, selectedItems.value, event)
    clearSelectionWithLayout(currentLayout.value)
    updateSelectionStatus(selectedItems.value, event)
    plugin.eventBus.emit('assets-select', selectedItems.value)
};
plugin.eventBus.on(globalKeyboardEvents.globalKeyDown, (e) => {
    const { key } = e.detail
    if (key === 'Escape') {
        isSelecting.value = false
        selectedItems.value = []
    }
})

/**
 * 拖放相关逻辑
 */
import { reactive, shallowRef } from '../../../static/vue.esm-browser.js';
import { onDragStartWithLayout, handlerDropWithTab } from '../utils/drag.js'
import CommonBreadCrumb from './common/breadCrumb/commonBreadCrumb.vue';
import { globalKeyboardEvents } from '../../events/eventNames.js';
const onDragStart = async (event) => {
    onDragStartWithLayout(event, currentLayout.value)
}
plugin.eventBus.on('update-tag', (event) => {
    if (event.detail.label === appData.value.tab.data.tagLabel) {
        refreshPanel()
    }
})
const handlerDrop = (event) => {
    handlerDropWithTab(event, appData.value.tab)
};
const selectionBoxStyle = computed(() => {
    const { startX, startY, endX, endY } = selectionBox.value;
    return {
        position: 'fixed',
        outline: '1px dashed #000',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
        left: `${Math.min(startX, endX)}px`,
        top: `${Math.min(startY, endY)}px`,
        width: `${Math.abs(startX - endX)}px`,
        height: `${Math.abs(startY - endY)}px`,
        pointerEvents: 'none'
    };
});
const sorter = ref({
    fn: (a, b) => {
        return -(a.data.mtimeMs - b.data.mtimeMs)
    }
})
import { 打开附件组菜单 } from '../siyuanCommon/menus/galleryItem.js';
import { 表格视图阈值 } from '../utils/threhold.js';
const openMenu = (event) => {
    let assets = currentLayout.value.layout.filter(item => item.selected).map(item => item.data).filter(item => item)
    打开附件组菜单(event, assets, {
        position: { y: event.y || e.detail.y, x: event.x || e.detail.x }, panelController: {
            refresh: () => refreshPanel()
        },
        tab: appData.value.tab,
        layout: currentLayout,
        files: 附件数据源数组.value.data
    })
}
</script>
<style scoped>
.grid__container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    /* Adjust the size as needed */
    gap: 0px 0px;
    /* Adjust the spacing between buttons */
}
</style>