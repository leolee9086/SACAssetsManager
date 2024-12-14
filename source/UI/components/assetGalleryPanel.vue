<template>
    <div @wheel.ctrl.stop.prevent="(event) => { size = 从滚轮事件计算(size, event, 1024, 32) }" class=" fn__flex-column"
        style="max-height: 100%;" ref="root">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1">
            </div>
            <div class=" fn__flex ">
                <div class="fn__space fn__flex-1"></div>
                <apiIcon v-if="() => appData.value.everythingApiLocation ? true : false" :apiEnabled="everthingEnabled">
                </apiIcon>
                <input v-model="size" style="box-sizing: border-box;width: 200px;" :value="200"
                    class="b3-slider fn__block" :max="$max" min="32" step="1" type="range">
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex" style="margin:auto">
                    <button @click="refreshPanel" class="cc-panel-toolbar-button">
                        <svg class="panel-toolbar-button-icon">
                            <use xlink:href="#iconRefresh"></use>
                        </svg>
                    </button>
                </div>

                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex" style="margin:auto">
                    <colorPicker v-model="filterColor" :pallet="pallet" @update:modelValue="handleColorChange" />
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
                    <button class="cc-panel-toolbar-button">
                        <svg class="panel-toolbar-button-icon">
                            <use xlink:href="#iconFilter"></use>
                        </svg>
                    </button>
                </div>
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex">
                    <input v-model="rawSearch" ref="searchInputter" style="box-sizing: border-box;width:100px;">
                </div>
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1 "></div>
            <multiple v-model="selectedExtensions" :options="extensions"></multiple>
            <div class="fn__space fn__flex "></div>
            <multiple v-if='卡片显示模式 === LAYOUT_ROW' v-model="selectedAttributes" placeholder="显示的属性"
                :options="Attributes">
            </multiple>
            <div class="fn__space fn__flex "></div>
            <multiple v-if='卡片显示模式 === LAYOUT_COLUMN' v-model="selectedMosanicAttributes" placeholder="显示的属性"
                :options="Attributes"></multiple>
            <div class="fn__space fn__flex-1 "></div>
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
            <assetsGridRbush @ready="创建回调并获取数据" ref="grid" :tableViewAttributes="displayAttributes" :assetsSource="数据缓存"
                :cardDisplayMode="卡片显示模式" @palletAdded="palletAdded" :globSetting="$realGlob"
                v-if="showPanel && globSetting" @layoutCountTotal="(e) => { layoutCountTotal = e }"
                @layoutChange="handlerLayoutChange" @scrollTopChange="handlerScrollTopChange" :sorter="sorter"
                @layoutCount="(e) => { layoutCount.found = e }" :filterColor="filterColor"
                @paddingChange="(e) => paddingLR = e" @layoutLoadedCount="(e) => { layoutCount.loaded = e }"
                :size="$size">
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
import { ref, inject, computed, nextTick, watch, toRef, onMounted, onUnmounted } from 'vue'
import assetsGridRbush from './galleryPanel/assetsGridRbush.vue';
import apiIcon from './galleryPanel/apiIcon.vue';
import { plugin } from 'runtime'
import _path from '../../polyfills/path.js'
import * as endPoints from '../../server/endPoints.js'
import { addUniquePalletColors } from '../../utils/color/filter.js';
import multiple from "./common/selection/multiple.vue";
import { extractFileExtensions } from "../../utils/fs/extension.js";
import { 创建带中间件的Push方法 } from "../../utils/array/push.js";
import { 校验数据项扩展名, 解析数据模型, 根据数据配置获取数据到缓存, 构建遍历参数, useGlob, useExtensions } from "./galleryPanelData.js";
import { 柯里化 } from "../../utils/functions/currying.js";
import { LAYOUT_COLUMN, LAYOUT_ROW, 根据尺寸获取显示模式, 表格视图阈值 } from '../utils/threhold.js';
import ColorPicker from './galleryPanel/colorPicker.vue'
//主要数据对象
const appData = toRef(inject('appData'))
/**
 * 监听相关事件刷新面板
 */
plugin.eventBus.on('need-refresh-gallery-panel', (e) => {
    const { type, data } = e.detail;
    if (type === 'tag') {
        appData.value.tagLabel ? refreshPanel() : null;
    }
})

/**
 * 显示模式相关逻辑
 */
const 卡片显示模式 = computed(() => 根据尺寸获取显示模式($size.value));
/**
 * 获取扩展名列表相关逻辑
 */
const {
    extensions,
    selectedExtensions
} = useExtensions()
onMounted(() => {
    //当有本地路径时,使用接口获取文件缩略图
    if (appData.value.localPath) {
        const url = endPoints.fs.path.getPathExtensions(appData.value.localPath)
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
 * 启动之后聚焦到关键词输入框
 */
const searchInputter = ref(null)
onMounted(() => {
    nextTick(
        () => searchInputter.value.focus()
    )
})
/**
 * 获取数据相关
 */
const 扩展名map = new Map();

const updateExtensionsMiddleware = (获取配置, 获取扩展名缓存) => {
    return (数据) => {
        if (!获取配置().localPath) {
            let extensions = extractFileExtensions(数据)
            extensions.forEach(
                item => {
                    if (!扩展名map.get(item)) {
                        获取扩展名缓存().push(item)
                        扩展名map.set(item, true)
                    }
                }
            )
        }
        return 数据;
    }
};

const filterArgsMiddleware = (filterFunc) => {
    return (args) => {
        let result = args.filter(arg => filterFunc(arg));
        return result
    };
}

let filterFunc = (item) => {
    if (!selectedExtensions.value) {
        return true
    } else {
        return 柯里化(校验数据项扩展名)(selectedExtensions.value)(item)
    }
}
const Attributes = ref([])
const 属性Map = new Map();
const selectedAttributes = ref([])
const selectedMosanicAttributes = ref([])
const displayAttributes = computed(
    () => 卡片显示模式.value === LAYOUT_COLUMN ? selectedMosanicAttributes.value : selectedAttributes.value
)
// ... existing code ...
const 提取属性名中间件 = (布局控制器, 数据缓存) => {
    for (let i = 0; i < 数据缓存.length; i++) {
        const item = 数据缓存[i];
        for (const name in item) {
            if (item.hasOwnProperty(name)) {
                布局控制器.addAttributeName(item.type, name);
            }
        }
    }
    return 数据缓存;
};


import { 提取缩略图路径中间件, 提取NoteID中间件, 提取tags中间件 } from '../../data/attributies/attributeParsers.js';
const 初始化数据缓存 = () => {
    const 数据缓存 = { data: [] }
    数据缓存.clear = () => {
        数据缓存.data.length = 0
    }
    const processedAttributes = new Set();

    const 布局控制器 = {
        getCardSize: () => {
            return size.value
        },
        addAttributeName: (type, name) => {
            const attributeKey = `${type}:${name}`;
            if (processedAttributes.has(attributeKey)) {
                return; // 跳过已经处理过的组合
            }
            processedAttributes.add(attributeKey);

            if (!属性Map.has(type)) {
                属性Map.set(type, [name]);
            } else {
                const existingAttributes = 属性Map.get(type);
                if (!existingAttributes.includes(name)) {
                    existingAttributes.push(name);
                    属性Map.set(type, existingAttributes);
                }
            }
            Attributes.value = Array.from(属性Map.values()).flat();
        }

    }
    extensions.value = []
    创建带中间件的Push方法(
        数据缓存.data,
        {},
        柯里化(提取缩略图路径中间件)(布局控制器),
        提取tags中间件,
        提取NoteID中间件,
        柯里化(提取属性名中间件)(布局控制器),
        updateExtensionsMiddleware(() => appData.value, () => extensions.value),
        filterArgsMiddleware(filterFunc),
    );
    return 数据缓存
};

let 数据缓存 = shallowRef(初始化数据缓存())
const grid = ref(null)
let controller = new AbortController();
let signal = controller.signal;
const everthingEnabled = ref(false)
const filListProvided = ref(null)
const 创建回调并获取数据 = async () => {
    数据缓存.value.clear()
    extensions.value = []
    if (appData.value.localPath) {
        const url = endPoints.fs.path.getPathExtensions(appData.value.localPath)
        fetch(url).then(
            res => res.json()
        ).then(
            data => {
                data.extensions.forEach(extension => extensions.value.push(extension))
            }
        )
    }
    try {
        initializeSize();
        if (filListProvided.value) {
            数据缓存.value.data.push(...filListProvided.value);
        } else {
            console.log( $realGlob.value)
            const dataModel = 解析数据模型(appData.value, 数据缓存.value, $realGlob.value, everthingEnabled);
            const fetcher = 根据数据配置获取数据到缓存(dataModel, signal, callBack);
            await fetcher()
        }
        nextTick(callBack);
    } catch (e) {
        console.warn(e);
    }
};


const initializeSize = () => {
    if (appData.value && appData.value.ui && appData.value.ui.size) {
        size.value = parseInt(appData.value.ui.size);

    }
};
const callBack = (...args) => {
    grid.value && grid.value.dataCallBack ? grid.value.dataCallBack(...args) : null;
};
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
 * 遍历选项相关逻辑
 */
const { search, globSetting } = useGlob()
const $realGlob = computed(() => 构建遍历参数(globSetting.value, search.value, selectedExtensions.value))
watch(
    () => $realGlob.value, () => {
        refreshPanel()
    }
)


/**
 * 缩放相关
 */
import { 从滚轮事件计算 } from '../utils/scroll.js';
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
const filterColor = ref(appData.value.color || [])
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
const $max = ref(1024);
onMounted(() => {
    const resizeObserver = new ResizeObserver(() => {
        let result = root.value?.getBoundingClientRect().width
        if (result) {
            result = result / 2 - result / 6 + 32
        }
        $max.value = result || 1024;
        if (parseInt(size.value) > $max.value) {
            size.value = $max.value
        }
    });
    if (root.value) {
        resizeObserver.observe(root.value);
    }
    onUnmounted(() => {
        resizeObserver.disconnect();
    });
});

const $size = computed(
    () => {
        let raw = parseInt(size.value)
        grid.value ? raw = Math.min(raw, grid.value.getContainerWidth() - 20) : null
        let columnCount
        grid.value && (columnCount = 根据宽度和尺寸计算列数和边距(grid.value.getContainerWidth(), raw, 表格视图阈值).columnCount);
        columnCount === 1 && (raw > 表格视图阈值) ? raw = grid.value.getContainerWidth() - 20 : null
        return raw
    }
)
//最大显示数量
const root = ref(null)
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
    fetch(`http://localhost:${plugin.http服务端口号}/eagle-path?path=${appData.value.localPath}`).then(res => res.json()).then(json => {
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
import { clearSelectionWithLayout, diffByEventKey, endSelectionWithController, handleMultiSelection, startSelectionWithController, 计算选择框样式 } from '../utils/selection.js'

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
const endSelection = (event) => {
    endSelectionWithController(event, selectionController)
    const galleryContainer = root.value.querySelector('.gallery_container');
    const layoutRect = galleryContainer.getBoundingClientRect();
    const coordinates = calculateSelectionCoordinates(selectionBox.value, layoutRect, currentLayoutOffsetTop, paddingLR.value, $size.value)
    selectedItems.value = handleMultiSelection(currentLayout.value, coordinates, $size.value < 表格视图阈值)
    selectedItems.value = diffByEventKey(previousSelectedItem.value, selectedItems.value, event)
    clearSelectionWithLayout(currentLayout.value)
    updateSelectionStatus(selectedItems.value, event)
    plugin.eventBus.emit('assets-select', selectedItems.value)
    appData.value.selectedItems = selectedItems.value
};
const selectionController = {
    endSelection,
    isSelecting,
    selectionBox,
    previousSelectedItem,
    selectedItems,
    root,
}
const startSelection = (e) => { startSelectionWithController(e, selectionController) }
const 画廊组件容器 = computed(() => root.value.querySelector('.gallery_container'))

const updateSelection = (event) => {
    let 选择框 = selectionBox.value
    let 选择状态中 = isSelecting.value
    let 布局元素矩形 = 画廊组件容器.value.getBoundingClientRect()
    if (选择状态中) {
        选择框.endX = event.x;
        选择框.endY = event.y;
        const coordinates = calculateSelectionCoordinates(选择框, 布局元素矩形, currentLayoutOffsetTop, paddingLR.value)
        selectedItems.value = handleMultiSelection(currentLayout.value, coordinates, $size.value < 表格视图阈值)
        selectedItems.value = diffByEventKey(previousSelectedItem.value, selectedItems.value, event)
        clearSelectionWithLayout(currentLayout.value)
        updateSelectionStatus(selectedItems.value, event)
    }
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
    if (event.detail.label === appData.value.tagLabel) {
        refreshPanel()
    }
})
const handlerDrop = (event) => {
    handlerDropWithTab(event, appData.value.tab)
};
const selectionBoxStyle = computed(() => 计算选择框样式(selectionBox.value));
const sorter = ref({
    fn: (a, b) => {
        return -(a.data.mtimeMs - b.data.mtimeMs)
    }
})
import { 打开附件组菜单 } from '../siyuanCommon/menus/galleryItem.js';
import { 根据宽度和尺寸计算列数和边距 } from '../utils/layoutComputer/masonry/columnAndPadding.js';
const openMenu = (event) => {
    let assets = currentLayout.value.layout.filter(item => item.selected).map(item => item.data).filter(item => item)
    打开附件组菜单(event, assets, {
        position: { y: event.y || e.detail.y, x: event.x || e.detail.x }, panelController: {
            refresh: () => refreshPanel()
        },
        tab: appData.value.tab,
        layout: currentLayout,
        files: 数据缓存.value.data,
        data: appData.value
    })
}

// 颜色变化处理函数
const handleColorChange = (newColor) => {
    plugin.eventBus.emit('click-galleryColor', newColor)
    refreshPanel()
}
</script>
<style scoped>
.grid__container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    gap: 0px 0px;
}
</style>