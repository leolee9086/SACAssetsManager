<template>
    <div class="fn__flex fn__flex-1" v-if="folderInfos.length > 0">
        <div class="fn__flex-column fn__flex-1" style="margin-left: 15px;" @scroll="handleScroll">
            <template v-for="(folder, i) in folderInfos">
                <div class="fn__flex disk-tiny-item" v-if="folder && folder.parentPath.startsWith(diskName + '/')"
                    :class="{ 'stripe': i % 2 === 0, 'disk-tiny-item-selected': folder.selected }"
                    @click="(e) => callbacks(folder)(e)">
                    <span :style="{
                        marginLeft: (folder.depth - 1) * 14 + 'px',
                        marginTop: 0 - calcMargin(folder) - 7 + 'px',
                        marginBottom: 7 + 'px',
                        width: (folder.depth - 1) * 14 + 'px',
                        borderLeft: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                        borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                        zIndex: genVisible(folder) ? 1 : ''
                    }"></span>
                    <span :style="{
                        marginBottom: 7 + 'px',
                        width: 14 + 'px',
                        borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                        zIndex: genVisible(folder) ? 1 : ''
                    }"></span>
                    <span :style="{
                        marginBottom: 7 + 'px',
                        width: 14 + 'px',
                        borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                        zIndex: genVisible(folder) ? 1 : ''
                    }"></span>
                    <div @click.right="(event)=>打开文件夹图标菜单(event,folder.path,{position:{x:event.x,y:event.y}})"
                        class="disk-tiny-item-text fn__flex fn__flex-1">
                        {{ folder.name }}
                        <div class="fn__space fn__flex-1"></div>
                        <span>{{ folder.fileCount }}</span>
                        <span class="fn__space"></span>
                        <span>{{ folder.folderCount }}</span>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { buildMultiClickListener } from '../../../../src/utils/DOM/continuousEvent.js';
import { 打开文件夹图标菜单 } from '../../siyuanCommon/menus/folderItem.js';

const props = defineProps({
    folderInfos: {
        type: Array,
        required: true
    },
    diskName: {
        type: String,
        required: true
    },
    toggleSUbFolders: {
        type: Function,
        required: true
    },
    openFolder: {
        type: Function,
        required: true
    }
})

const callbacks = (folder) => {
    folder.callbacks = folder.callbacks || buildMultiClickListener(300, [
        (event) => {
            props.toggleSUbFolders(folder.path)
        },
        (event) => {
            props.openFolder(folder.path)
        }
    ])
    return folder.callbacks
}

const genVisible = (folder) => {
    let flag
    if (!folder) { return false }
    folder.selected && (flag = true)
    props.folderInfos.find(item => item.selected && item.path.indexOf(folder.path) === 0) && (flag = true)
    props.folderInfos.find(item => item.selected && folder.path.indexOf(item.path) === 0) && !props.folderInfos.find(item => item.selected && item.parentPath === folder.parentPath) && (flag = true)
    !props.folderInfos.find(item => item.selected) && (flag = true)
    folder.visible = flag
    return flag
}

const calcMargin = (folder) => {
    const index = props.folderInfos.findIndex(item => { return item.path === folder.path })
    let parentIndex = props.folderInfos.findIndex(item => { return item.parentPath === folder.parentPath })
    return (index - parentIndex) * 19
}
</script>

<style scoped>
.disk-tiny-item-selected .disk-tiny-item-text {
    background-color: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
}

.stripe {
    background-color: var(--b3-theme-background-light);
}
</style> 