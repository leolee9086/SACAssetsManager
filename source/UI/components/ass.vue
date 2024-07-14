<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>

            <div class=" fn__flex ">
                <input v-model="size" @change="setupScrollListener" style="box-sizing: border-box;width: 200px;"
                    value="100" class="b3-slider fn__block" max="1024" min="64" step="1" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>

        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>

        <div class=" fn__flex " style="align-items: center;">

            <!--<div class=" fn__flex  block__icons">
                <span aria-label="搜索过滤" class="block__icon ariaLabel" data-position="9bottom" >
                    <svg>
                        <use xlink:href="#iconFilter"></use>
                    </svg>
                </span>
                文件类型

                <select class="b3-select fn__flex-center fn__size200"  >
                    <template v-for="format in formats">

                        <option :value="format" style="max-width: 300px;display: block !important;">{{ format }}</option>

                    </template>
</select>

</div>-->
            <div class="fn__space fn__flex-1"></div>

        </div>
        <div class="fn__space "></div>

        <div class="fn__flex-column fn__flex-1" style="width:100%">
            <div class="fn__flex-column fn__flex-1" style="width:100%">

                <div class="fn__flex-1" @scroll.stop.prevent ref="gridsContainer" @mousedown="startSelection"
                    @mousemove="updateSelection" @mouseup="endSelection" style="overflow-x: hidden;">

                    <div class="fn__flex-column " style="width:100% ;min-height:0px">

                        <div @scroll.stop.prevent="setupScrollListener"
                            :style="`top:16px;left:0;width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(${size}px, 1fr)); grid-gap: 10px;transform: translate(0,${paddingTop}px);min-height:${TotalRows * size} `">
                            <template v-for="(asset, i) in assetsMetas" :key="`iframe-${asset.id}`">
                                <div @mousedown="(e) => {
                    if (!isSelecting) {
                        e.stopPropagation()
                    }
                }" 
                
                
                @click.right.stop.prevent.capture="(event) => 打开附件右键菜单(event, selectedItems)"
                
                class="ariaLabel" 
                aria-label="双击打开,右键更多" 
                :id="`div-${asset.index}`" 
                :style="{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: 'var(--b3-theme-background-light)',
                    borderRadius: `${size / 12}px`,
                    border: selectedItems.indexOf(asset) >= 0 ? '1px solid red' : ''
                }">

                                    <div v-if="currentStartIndex <= asset.index && asset.index <= currentEndIndex && !uploading"
                                        :style="`position:absolute;width: ${size}px;height: ${size}px;border-radius:${size / 12}px`">
                                        <div
                                            :style='`position:absolute;top:${size / 24}px;left:${size / 24}px;background:rgba(0,0,0,0.5);color:white;padding:2px;font-size:10px;height:1em`'>
                                            {{ asset.path.split('.').pop() }}
                                        </div>
                                    </div>
                                    <div v-if="currentStartIndex <= asset.index && asset.index <= currentEndIndex && !uploading"
                                        :style="`min-width: 100%;width: ${size}px;min-height:100%;height: ${size}px;border-radius:${size / 12}px`">
                                        <iframe :id="`frame-${asset.path}`" :width="size" :height="size"
                                            :style="`border-radius:${size / 12}px;border: none`"
                                            :data-asset='`${asset.path}`' :data-path="`${asset.path}`"
                                            :src="createIframes(asset)">
                                        </iframe>
                                        <!--此处使用img的性能还不如iframe-->
                                        <!-- <img loading="lazy" 
                                        decoding=async
                                            :src='genSrc(asset)'
                                            :style='`width:100%;height:100%;object-fit:cover;border-radius:${size / 12}px`' />-->
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>

        </div>
    </div>
</template>
<script setup>
const crypto = window.require('crypto');
import DocBreadCrumb from './docbreadCrumb.vue'

import { ref, onMounted, inject, computed, toRef } from 'vue'
import fs from '../../polyfills/fs.js'
import { plugin } from 'runtime'
//import {智能防抖} from '../../utils/functionTools.js'
const assetsMetas = ref([])
const gridsContainer = ref(null)
const loadedMetas = ref([])
const currentStartRow = ref(0)
const currentEndRow = ref(30)
const currentStartIndex = ref(0)
const currentEndIndex = ref(100)
const currentFormats = ref([])
const TotalRows = ref(10)
const size = ref(100)
const formats = ref([])
const appData = toRef(inject('appData'))
const block_id = computed(
    () => {
        return appData && appData.value && appData.value.tab.data.block_id ? appData.value.tab.data.block_id : ''
    }
)
const box = computed(
    () => {
        return appData && appData.value && appData.value.tab.data.box ? appData.value.tab.data.box : ''
    }
)

const formatsFilter = (Array) => {
    if (currentFormats.value.length) {
        return Array.filter(item => {
            item && currentFormats.value.IndexOf(item.format) >= 0
        })
    } else {
        return Array
    }
}
function 打开附件右键菜单(event, assets) {
    console.log(event, assets)
    plugin.eventBus.emit('rightclick-galleryitem', { event, assets })
}
async function fetchAssets(tab) {
    let query = "select * from assets  limit 102400"
   /* if (tab.data && tab.data.block_id) {
        query = `select * from assets where docpath like '%${tab.data.block_id}%' limit 102400`
    } else if (tab.data.box) {
        query = `select * from assets where box = '${tab.data.box}' limit 102400`

    }*/
    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    })
        .then(data => data.json())
    let mock = await json.data
    mock=mock.concat(mock).concat(mock).concat(mock).concat(mock).concat(mock).concat(mock).concat(mock)
    let data = await json.data.map(
        (item, i) => {
            return {
                index: i,
                format: item.path.split('.').pop(),
                ...item
            }
        }
    )
    return data
}
async function fetchLinks(tab) {
    let query = "select * from spans  limit 102400"
    if (tab.data && tab.data.block_id) {
        query = `select * from spans where root_id like '%${tab.data.block_id}%' limit 102400`
    } else if (tab.data.box) {
        query = `select * from spans where box = '${tab.data.box}' limit 102400`
    }

    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    }).then(data => data.json())

    let data = await json.data.map(
        (item, i) => {
            return {
                ...item,
                format: item.type,
                path: `data:text/markdown;charset=utf-8,${item.markdown}`,

            }
        }
    ).filter(
        item => !(item.markdown.indexOf('](assets') >= 0) && item.format === 'textmark a'
    )
    return data
}
const chunkedAssets = ref({})
onMounted(
    async () => {

        let assets = await fetchAssets(appData.value.tab);
        let links = await fetchLinks(appData.value.tab);
        (() => {
            assetsMetas.value = JSON.parse(JSON.stringify(assets.concat(links).map(
                (item, i) => { item.index = i; return item }))
            )
            chunkedAssets.value = assetsMetas.value.slice(0, 10)
            gridsContainer.value.addEventListener('wheel', scaleListener);
            gridsContainer.value.addEventListener('scroll', setupScrollListener,{passive:true});
        })()
    }
)
function scaleListener(event) {
    if (event.ctrlKey) {
        let value = parseInt(size.value)

        value -= event.deltaY / 10
        if (value < 100) {
            value = 100
        }
        if (value > 1024) {
            value = 1024
        }
        size.value = value
        event.preventDefault()
        event.stopPropagation()
    }
}
function genSrc(asset) {
    return `http://127.0.0.1/thumbnail/?path=${asset.path}`
}
let imageHtmlContent
function createIframes(asset) {
    const HtmlContent = imageHtmlContent || fs.readFileSync(`/data/plugins/SACAssetsManager/source/previewers/common.html`)
    imageHtmlContent = HtmlContent

    const encodedHtmlContent = encodeURIComponent(imageHtmlContent);
    return `data:text/html;charset=utf-8,${encodedHtmlContent}`;
}
const paddingTop = ref(0)
let uploading = false
const visibleItems=computed(()=>{
    if(!gridsContainer.value){
        return []
    }
    const {top,bottom} =gridsContainer.value.getBoundingClientRect();
    return assetsMetas.value.filter(asset => {
        const assetElement = document.getElementById(`div-${asset.index}`);
        console.log(assetElement,`div-${asset.index}`)
        if(assetElement){
        const rect = assetElement.getBoundingClientRect();
        return  rect.bottom < top && rect.top > bottom;
        }
    });
})
 function setupScrollListener(event) {
            const {top,bottom} =gridsContainer.value.getBoundingClientRect();
            let startElement,endsElement
            assetsMetas.value.forEach(
                (asset,i)=>{
                    const assetElement = document.getElementById(`div-${asset.index}`);
                    if(!startElement||!endsElement){
                        const rect = assetElement.getBoundingClientRect();
                        !startElement&&(rect.bottom > top - size.value*2)&&(startElement=assetElement,currentStartIndex.value=i)
                        !endsElement&&(rect.top > bottom + size.value*2)&&(endsElement=assetElement,currentEndIndex.value=i)

                    }
                }
            )
            console.log(currentStartIndex.value,currentEndIndex.value)
           /* event.stopPropagation();
            if (uploading) {
                return
            }
            uploading = true
            let _size = { value: parseInt(size.value) }
            const { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
            const displayColumns = Math.floor(clientWidth / (_size.value + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
            const displayRows = Math.floor(clientHeight / (_size.value + 10)); // 计算列数
            TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1
            const totalVisibleItems = displayColumns * displayRows * 1.5;
            const startRow = scrollTop / (_size.value + 10) - 1
            currentStartIndex.value = Math.max(startRow * displayColumns, 0)
            currentEndIndex.value = currentStartIndex.value + totalVisibleItems * 3
            uploading = false*/
        
    
    /*  let _size = { value: parseInt(size.value) }
      paddingTop.value -= 2 * event.deltaY * size.value / 100
      const { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
      gridsContainer.value.scrollTop += event.deltaY * size.value / 100
      console.log(paddingTop.value)
      const displayColumns = Math.floor(clientWidth / (_size.value + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
      const displayRows = Math.floor(clientHeight / (_size.value + 10)); // 计算列数
      TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1
      const totalVisibleItems = displayColumns * (displayRows);
      while (chunkedAssets.value.length < totalVisibleItems) {
          const nextIndex = chunkedAssets.value[chunkedAssets.value.length - 1].index + 1;
          if (assetsMetas.value[nextIndex]) {
              chunkedAssets.value.push(assetsMetas.value[nextIndex]);
          } else {
              break; // 没有更多的元素可以添加
          }
      }
  
      if (paddingTop.value < 0 && !assetsMetas.value[chunkedAssets.value[chunkedAssets.value.length - 1].index + 1]) {
          paddingTop.value = 0
  
          return
      }
      if (0 - paddingTop.value >= _size.value + 10) {
          console.log(displayColumns)
          for (let i = 0; i < displayColumns; ++i) {
              if (assetsMetas.value[chunkedAssets.value[chunkedAssets.value.length - 1].index + 1]) {
                  chunkedAssets.value.push(assetsMetas.value[chunkedAssets.value[chunkedAssets.value.length - 1].index + 1])
                  chunkedAssets.value.shift()
              }
              paddingTop.value = 0
          }
      }
  
      if (paddingTop.value > 0 && chunkedAssets.value[0].index === 0) {
          paddingTop.value = 0
          return
      }
      // 向上滚动逻辑
      if (paddingTop.value > _size.value + 10) {
          console.log(displayColumns);
          for (let i = 0; i < displayColumns; ++i) {
              if (chunkedAssets.value[0].index > 0) {
                  chunkedAssets.value.unshift(assetsMetas.value[chunkedAssets.value[0].index - 1]);
                  chunkedAssets.value.pop();
              }
              paddingTop.value = 0;
          }
      }*/
}




/***
 * 选择相关逻辑
 */
const isSelecting = ref(false);
const selectionBox = ref({ startX: 0, startY: 0, endX: 0, endY: 0 });
const selectedItems = ref([])
const startSelection = (event) => {
    isSelecting.value = true;
    selectionBox.value.startX = event.x;
    selectionBox.value.startY = event.y;
    selectionBox.value.endX = event.x;
    selectionBox.value.endY = event.y;
};

const updateSelection = (event) => {
    if (isSelecting.value) {
        selectionBox.value.endX = event.x;
        selectionBox.value.endY = event.y;
    }
    selectedItems.value = getSelectedItems();

};

const endSelection = () => {
    isSelecting.value = false;
    selectedItems.value = getSelectedItems();
};

const getSelectedItems = () => {
    const { startX, startY, endX, endY } = selectionBox.value;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    return assetsMetas.value.filter(asset => {
        const assetElement = document.getElementById(`frame-${asset.path}`);
        if (!assetElement) return false;
        const rect = assetElement.getBoundingClientRect();
        return rect.left < maxX && rect.right > minX && rect.top < maxY && rect.bottom > minY;
    });
};

const selectionBoxStyle = computed(() => {
    const { startX, startY, endX, endY } = selectionBox.value;
    return {
        position: 'fixed',
        border: '1px dashed #000',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
        left: `${Math.min(startX, endX)}px`,
        top: `${Math.min(startY, endY)}px`,
        width: `${Math.abs(startX - endX)}px`,
        height: `${Math.abs(startY - endY)}px`,
        pointerEvents: 'none'

    };
});

</script>