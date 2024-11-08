<template>
    <input type="text"  v-if="!cardData" v-model="$blockID" :placeholder="'请输入块ID'" @input="handleInput"
        class="b3-text-field fn__flex-1" />

    <div ref="protyleContainer"
        :style="{ backgroundColor: 'var(--b3-theme-background)', backgroundImage: 'url(/stage/loading-pure.svg)', backgroundSize: 'contain', minHeight: size + 'px', minWidth: size + 'px' }">
        <div></div>
    </div>
</template>
<script nodeDefine>
import { ref } from 'vue';
import { kernelApi } from 'runtime';
import { 根据块ID创建protyle } from '../../../../utils/siyuanUI/protyle/build.js';
const $blockID = ref('')
const  handleInput=()=>{
    $blockID.value&&nodeDefine.process( $blockID.value)
}
export let nodeDefine = {
    outputs: {
        id: {
            type: String,
            label: '块ID',
        },
        parent_id: {
            type: String,
            label: '父块ID',
        },
        root_id: {
            type: String,
            label: '根块ID',
        },
        hash: {
            type: String,
            label: '哈希值',
        },
        box: {
            type: String,
            label: '笔记本ID',
        },
        path: {
            type: String,
            label: '路径',
        },
        hpath: {
            type: String,
            label: '人类可读路径',
        },
        name: {
            type: String,
            label: '名称',
        },
        alias: {
            type: String,
            label: '别名',
        },
        memo: {
            type: String,
            label: '备注',
        },
        tag: {
            type: String,
            label: '标签',
        },
        content: {
            type: String,
            label: '内容',
        },
        fcontent: {
            type: String,
            label: '格式化内容',
        },
        markdown: {
            type: String,
            label: 'Markdown内容',
        },
        length: {
            type: Number,
            label: '内容长度',
        },
        type: {
            type: String,
            label: '类型',
        },
        subtype: {
            type: String,
            label: '子类型',
        },
        ial: {
            type: String,
            label: '内联属性',
        },
        sort: {
            type: Number,
            label: '排序号',
        },
        created: {
            type: String,
            label: '创建时间',
        },
        updated: {
            type: String,
            label: '更新时间',
        },

    },
    async process(input) {
        try {
            const blockID = input;
            // 假设这里需要添加一个从数据库查询块信息的函数
            const blockData = await kernelApi.sql({ stmt: `select * from blocks where id ="${blockID}"` }); // 需要实现这个API
            buildProtyle(blockID)

            return {
                ...blockData, // 展开数据库查询返回的所有字段
            };
        } catch (error) {
            console.error('处理Protyle失败:', error);
            return {
                id: '', parent_id: '', root_id: '', hash: '',
                box: '', path: '', hpath: '', name: '',
                alias: '', memo: '', tag: '', content: '',
                fcontent: '', markdown: '', length: 0,
                type: '', subtype: '', ial: '', sort: 0,
                created: '', updated: '',
                protyleElement: null,
                containerElement: null
            };
        }
    },
};
const protyleContainer = ref(null);
let protyle;

let buildProtyle = (blockID) => {
    requestIdleCallback(() => {
        blockID && protyleContainer.value && (protyle = 根据块ID创建protyle(protyleContainer.value.firstElementChild, blockID));
        protyle && protyleContainer.value && (protyleContainer.value.style.minHeight = 0)
    }, { timeout: 100 });
}
export const getDefaultInput = () => {
    return undefined;
}
</script>
<script setup>
import { onMounted, toRef } from 'vue';
import { onUnmounted } from '../../../../../static/vue.esm-browser.js';
import { 获取素材属性值 } from '../../../../data/attributies/parseAttributies.js';

const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showImage', 'showIframe', 'size']);
const attributeName = toRef(props, 'attributeName');
const { cardData } = props;
let isUnmounted = false; // 新增标志


onMounted(async () => {
    if (cardData?.data.type === 'note') {
        if (isUnmounted) return; // 检查组件是否已销毁
        let blockID = await 获取素材属性值(cardData.data, attributeName.value);
        buildProtyle(blockID)
    }
});

onUnmounted(() => {
    isUnmounted = true; // 设置标志为已销毁
    protyle && protyle.destroy();
});
</script>
<style scoped>
.b3-text-field{
    min-height: 50px;
    max-height: 50px;
    height: 50px;
}
</style>