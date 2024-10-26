<template>
    <div class="ariaLabel" @click.right.stop="选择标签()" :aria-label="`标签\n右键编辑\n左键打开标签面板`" :style="`border:1px solid var(--b3-theme-background-light);
                    padding:0px;
                    margin:0px;
                    overflow:hidden;
                    width:${width};
                    min-width:${width};
                    max-width:${width};
                                        height:${height};
                    min-height:${height};
                    max-height:${height};

                    text-overflow:ellipsis;
                    white-space:nowrap;`

        ">
        <template v-if="tags[0]">
            <span v-for="item in tags" :key="item.label" :style="tagStyle" class="ariaLabel" :aria-label="item.label"
                @click.right.stop="选择标签()" @click.stop="打开标签资源视图(item.label)">
                {{ item.label.length > 6 ? item.label.substring(0, 6) + '...' : item.label }}
            </span>
        </template>
        <span v-else :style="noTagStyle">未标签</span>
    </div>

</template>

<script setup>
import { onMounted, ref, toRef, nextTick, computed } from 'vue';
import { findTagsByFilePath, findTagsByNoteID } from '../../../../data/tags.js';
import { 选择标签 } from '../../../siyuanCommon/dialog/tagPicker.js';
import { 打开标签资源视图 } from '../../../siyuanCommon/tabs/assetsTab.js';
const props = defineProps(['cardData', 'width','height', 'displayMode']);
const { cardData } = props
const width = toRef(props, 'width')
const height = toRef(props, 'height')

const displayMode = toRef(props, 'displayMode')

const tags = ref([])
onMounted(
    () => {
        if (cardData.data && cardData.data.type === 'note') {
            findTagsByNoteID(cardData.data.id).then(
                data => {
                    nextTick(() => {
                        data.forEach(
                            tagData => {
                                tags.value.push(
                                    {
                                        label: tagData
                                    }
                                )
                            }
                        )

                    })

                }
            )
        }
        if (cardData.data && cardData.data.path) {
            tags.value = findTagsByFilePath(cardData.data.path)
        }
    }
)
const noTagStyle = {
    color: 'red',
    fontSize: '12px'
};
const tagStyle = computed(() => {
    return {
        display: 'inline-block',
        backgroundColor: 'var(--b3-theme-background-light)',
        color: 'black',
        padding: displayMode.value === 'column' ? '' : '2px 4px',
        margin: '2px',
        borderRadius: '4px',
        fontSize: '12px',
        maxWidth: '6ch',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxHeight: displayMode.value === 'column' ? '14px' : 'auto' // 根据 displayMode 调整最大高度
    };
});

</script>
<style scoped>
.tag {
    display: inline-block;
    background-color: var(--b3-theme-background-light);
    color: black;
    padding: 2px 4px;
    margin: 2px;
    border-radius: 4px;
    font-size: 12px;
    max-width: 6ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>