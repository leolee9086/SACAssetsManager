<template>
    <div class="fn__flex fn__flex-column fn__flex-1">
        <div class="ariaLabel"
            :aria-label="globalSelectedAssets?.filter(item => item && item.data && item.data.path).map(item => item.data.path).join('  ')">
            当前选中文件 ({{ globalSelectedAssets?.length || 0 }}): {{ globalSelectedAssets?.filter(item => item && item.data
                && item.data.path).map(item =>
                    item.data.path.split('/').pop()
            ).join(' ') }}
        </div>
        <div class="fn__flex">
            <div class="fn__space"></div>
            <input v-model="searchQuery" @input="filterHash" placeholder="搜索标签..." />
            <div class="fn__space"></div>
            <div class="fn__space"></div>
            <button  @click="()=>应用当前选择的标签并刷新面板()">应用标签组</button>

            <button class="ariaLabel" aria-label="将当前搜索关键词作为标签写入今日笔记并选用"  v-if="!isTagExists" @click="()=>添加文本为标签并写入今日笔记(searchQuery)">+</button>
        </div>

        <div class="b3-chips fn__flex">
            <h3>选中的标签</h3>
            <template v-for="tag in selectedTags" :key="tag">
                <div @click="() => toggleTagSelection(tag)"
                    :class="['b3-chip', 'b3-chip--middle', 'b3-chip--pointer', 'b3-chip--secondary', getTagClass(tag)]">{{ tag }}</div>
            </template>
        </div>

        <!-- 显示当前文件已经使用的标签 -->
        <div class="b3-chips fn__flex">
            <h3>当前文件已使用的标签</h3>
            <template v-for="tag in currentFileTags" :key="tag">
                <div @click="() => toggleTagSelection(tag)" :class="['b3-chip', 'b3-chip--middle', 'b3-chip--pointer', 'b3-chip--secondary', getTagClass(tag)]">{{ tag }}</div>
            </template>
        </div>


        <div class="fn__flex fn__flex-column fn__flex-1">
            <div v-for="(group, label) in groupedTags" :key="label" class="tag-group">
                <h3>{{ label }}</h3>
                <div class="b3-chips fn__flex">
                    <div v-for="tag in group" :key="tag.label"
                        :class="['b3-chip', 'b3-chip--middle', 'b3-chip--pointer', 'b3-chip--secondary',getTagClass(tag.label) ,{ 'selected': isSelected(tag.label) }]"
                        @click="toggleTagSelection(tag.label)" @click.right="打开标签资源视图(tag.label)">
                        {{ tag.label }}
                        <span class="counter">{{ tag.count }}</span>
                        <span class="counter">{{ tag.assets ? tag.assets.length : 0 }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject,watch } from 'vue'
import { kernelApi, plugin, clientApi } from '../../../asyncModules.js';
import { addFilesToMultiTags, getTagAssets, removeFilesFromMultiTags, saveTags } from '../../../data/tags.js';
import _pinyin from '../../../../static/pinyin.js';
import { 打开标签资源视图 } from '../tabs/assetsTab.js';
import { getStatu, 状态注册表 } from '../../../globalStatus/index.js';
import { confirmAsPromise } from '../../../../src/utils/siyuanUI/confirm.js';
const searchQuery = ref(''); // 添加一个响应式变量来存储搜索查询
const selectedTags = ref([]); // 用于存储选中的标签
const isTagExists = computed(() => {
    return searchQuery.value === '' || tags.value.some(tag => tag.label === searchQuery.value);
});
const globalSelectedAssets = computed(
    () => getStatu(状态注册表.选中的资源)
)
watch(
    ()=>globalSelectedAssets?.value,()=>{
        appData.$dialog
        const headerElement = appData.$dialog.element.querySelector('.resize__move.b3-dialog__header');
        if (headerElement) {
            const count = globalSelectedAssets.value.length;
            headerElement.textContent = `为${count}个元素选择标签`;
            headerElement.insertAdjacentHTML('afterBegin',`<svg class="cc-dialog__close" style="position:absolute;top:2px;left:2px"><use xlink:href="#iconCloseRound"></use></svg>`)
            headerElement.querySelector(".cc-dialog__close").addEventListener('click',()=>{appData.$dialog.destroy()})

        }
    }
)

const currentFileTags = computed(() => {
    const selectedFileNames = globalSelectedAssets.value.map(item => item.data.path);
    return tags.value.filter(tag => {
        const tagAssets = tag.assets || [];
        return selectedFileNames.some(fileName => tagAssets.includes(fileName));
    }).map(tag => tag.label);
});

const toggleTagSelection = (label) => {
    const index = selectedTags.value.indexOf(label);
    if (index === -1) {
        selectedTags.value.push(label);
    } else {
        selectedTags.value.splice(index, 1);
    }
    // 触发重新计算以更新下方标签的选中状态
    groupedTags.value = groupedTags.value; // 强制更新
};
const getTagClass = (tagLabel) => {
    const selectedFileNames = globalSelectedAssets.value.map(item => item.data.path);
    if (!selectedFileNames[0]) {
        return;
    }
    const tagAssets = tags.value.find(item => item.label === tagLabel).assets;

    return calculateMatchStatus(selectedFileNames, tagAssets);
};

const calculateMatchStatus = (selectedFileNames, tagAssets) => {
    // 完全匹配：所有选中文件都在这个标签中
    const isFullMatch = selectedFileNames.every(fileName => tagAssets.includes(fileName));

    // 部分匹配：部分文件在这个标签中
    const isPartialMatch = selectedFileNames.some(fileName => tagAssets.includes(fileName));

    if (isFullMatch) {
        return 'full-match';
    } else if (isPartialMatch) {
        return 'partial-match';
    }
    return '';
};
const isSelected = (label) => {
    return selectedTags.value.includes(label);
};
const filterHash = () => {
    searchQuery.value = searchQuery.value.replace(/#/g, '');
};
const 应用当前选择的标签并刷新面板 = async () => {
    // 获取选中的文件路径
    const selectedFilePaths = globalSelectedAssets.value.map(item => item && item.data.path);

    // 获取当前文件的标签
    const currentFileTagLabels = currentFileTags.value;

    // 计算需要添加和移除的标签
    const tagsToAdd = selectedTags.value.filter(tag => !currentFileTagLabels.includes(tag));
    const tagsToRemove = currentFileTagLabels.filter(tag => !selectedTags.value.includes(tag));

    // 转义HTML特殊字符
    const escapeHtml = window.Lute?window.Lute.EscapeHTMLStr:(str) => {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    };

    // 创建 diffInfo HTML 字符串，描述文件和标签的变化
    const addedInfo = tagsToAdd.map(tag => `
        <li style="color: green; margin-bottom: 10px;">
            添加到标签 "<strong>${escapeHtml(tag)}</strong>" 的文件:
            <ul style="margin-top: 5px;">${selectedFilePaths.map(filePath => `<li style="margin-bottom: 5px;">${escapeHtml(filePath)}</li>`).join('')}</ul>
        </li>
    `).join('');
    
    const removedInfo = tagsToRemove.map(tag => `
        <li style="color: red; margin-bottom: 10px;">
            从标签 "<strong>${escapeHtml(tag)}</strong>" 移除的文件:
            <ul style="margin-top: 5px;">${selectedFilePaths.map(filePath => `<li style="margin-bottom: 5px;">${escapeHtml(filePath)}</li>`).join('')}</ul>
        </li>
    `).join('');
    
    const diffInfo = `<ul style="list-style-type: none; padding: 0;">标签变化:${addedInfo}${removedInfo}</ul>`;    
    if (await confirmAsPromise('确认标签组编辑?', diffInfo)) {
        // 添加文件路径到需要添加的标签
        await addFilesToMultiTags(selectedFilePaths, tagsToAdd);
        // 从需要移除的标签中移除文件路径
        await removeFilesFromMultiTags(selectedFilePaths, tagsToRemove);
        appData.$dialog.destroy();
    }
}
const 添加文本为标签并写入今日笔记 = async (content) => {
    try {
        // 获取最近修改笔记所在的box
        const noteBooks = await kernelApi.sql({
            stmt: `select box from blocks order by updated desc limit 1`
        });

        if (!noteBooks || noteBooks.length === 0) {
            console.error("未找到最近修改的笔记");
            return;
        }

        // 准备要写入的markdown数据
        const markdown = `# 标签\n- #${content}#`;

        // 将内容写入到今日笔记
        const result = await kernelApi.appendDailyNoteBlock({
            data: markdown,
            dataType: 'markdown',
            notebook: noteBooks[0].box
        });
        if (result) {
            console.log("成功添加文本为标签并写入今日笔记");
        } else {
            console.error("写入失败", result.error);
        }
    } catch (error) {
        console.error("发生错误", error);
    }
}
const pinyin = _pinyin.default
pinyin.initialize()
const appData = inject('appData')
const tags = ref([])
let autoRefreshFlag = false
let intervalId
const filteredTags = computed(() => {
    if (!searchQuery.value) {
        return tags.value;
    }
    return tags.value.filter(tag => {
        const tagName = tag.label.toLowerCase();
        const query = searchQuery.value.toLowerCase();
        const pinyinName = pinyin.getFullChars(tagName).toLowerCase();
        return tagName.includes(query) || pinyinName.includes(query);
    });
});

const groupedTags = computed(() => {
    const groups = filteredTags.value.reduce((groups, tag) => {
        const firstLetter = pinyin.getCamelChars(tag.name)[0][0].toUpperCase();
        if (!groups[firstLetter]) {
            groups[firstLetter] = [];
        }
        groups[firstLetter].push(tag);
        return groups;
    }, {});

    // 自定义排序规则：数字 < 字母 < 其他符号
    return Object.keys(groups).sort((a, b) => {
        const isDigitA = /^\d/.test(a);
        const isDigitB = /^\d/.test(b);
        const isAlphaA = /^[A-Z]/.test(a);
        const isAlphaB = /^[A-Z]/.test(b);

        if (isDigitA && !isDigitB) return -1;
        if (!isDigitA && isDigitB) return 1;
        if (isAlphaA && !isAlphaB) return -1;
        if (!isAlphaA && isAlphaB) return 1;
        return a.localeCompare(b);
    }).reduce((sortedGroups, key) => {
        sortedGroups[key] = groups[key];
        return sortedGroups;
    }, {});
}); onUnmounted(() => {
    clearInterval(intervalId)
})

onMounted(async () => {
        // 监听 tags 的变化
        watch(tags, (newTags) => {
        const selectedFileNames = globalSelectedAssets.value.map(item => item.data.path);
        newTags.forEach(tag => {
            const tagAssets = tag.assets || [];
            const isPartialMatch = selectedFileNames.some(fileName => tagAssets.includes(fileName));
            if (isPartialMatch && !selectedTags.value.includes(tag.label)) {
                selectedTags.value.push(tag.label);
            }
        });
    }, { immediate: true });

    tags.value = await getTagAssets(await kernelApi.getTag({ sort: 0 }))
    plugin.eventBus.on('ws-main', async (e) => {
        if (e.detail.cmd === 'transactions') {
            const data = e.detail.data
            const { doOperations, undoOperations } = data[0];
            (doOperations || []).concat(undoOperations || []).forEach(async (operation) => {
                if (operation.data &&operation.data.indexOf&& operation.data.indexOf('<span data-type="tag">') > -1) {
                    autoRefreshFlag = true
                }
            });
        }
    })
    intervalId = setInterval(async () => {
        if (autoRefreshFlag) {
            tags.value = await getTagAssets(await kernelApi.getTag({ sort: 0 }))
            autoRefreshFlag = false
        }
    }, 1000)
})

</script>

<style scoped>
.tag-group {
    margin-bottom: 20px;
}

.tag-list {
    list-style-type: none;
    padding: 0;
}

.tag-item {
    display: inline-block;
    background-color: #f0f0f0;
    border-radius: 12px;
    padding: 5px 10px;
    margin: 5px;
    transition: background-color 0.3s;
    cursor: pointer;
}

.tag-item:hover {
    background-color: #e0e0e0;
}

.full-match {
    background-color: blue; /* 完全匹配显示为蓝色 */
    color: white;
}

.partial-match {
    background: linear-gradient(to right, blue 50%, transparent 50%); /* 部分匹配一半长度显示为蓝色 */
    color: black;
}

.selected {
    border: 2px dashed blue; /* 选中标签使用蓝色虚线边框 */
}

</style>