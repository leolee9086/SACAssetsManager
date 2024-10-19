<template>
    <div class="fn__flex-column fn__flex-1">
        <ul class="api-list">
            <template v-for="(hosts, type) in groupedApiList" :key="'api'+type">
                <li class="b3-list-item">
                    <span @click="toggleTypeFold(type)" data-type="layout"
                        class=" b3-list-item__toggle b3-list-item__toggle--hl" aria-label="上">
                        <svg class="b3-list-item__arrow">
                            <use :xlink:href="!typeFoldState[type] ? '#iconRight' : '#iconDown'"></use>
                        </svg>
                    </span>
                    {{ type }}
                </li>
                <ul v-show="typeFoldState[type]" v-if="hosts">
                    <template v-for="(apis, host) in hosts" :key="type+host">
                        <li class="b3-list-item">
                            <span @click="toggleHostFold(type, host)" data-type="layout"
                                class=" b3-list-item__toggle b3-list-item__toggle--hl" aria-label="上">
                                <svg class="b3-list-item__arrow" style="padding-left: 16px;">
                                    <use
                                        :xlink:href="!(hostFoldState[type] && hostFoldState[type][host]) ? '#iconRight' : '#iconDown'">
                                    </use>
                                </svg>
                            </span>
                            <strong @click="toggleHostFold(type, host)" class="api-list__host">{{ host }}</strong>
                        </li>
                        <ul v-show="hostFoldState[type] && hostFoldState[type][host]" class="api-list__subsublist">
                            <li class="b3-list-item">

                                <span data-type="layout" class=" b3-list-item__toggle b3-list-item__toggle--hl"
                                    aria-label="上">
                                    <svg class="b3-list-item__arrow" style="padding-left: 24px;">
                                        <use xlink:href=""></use>
                                    </svg>
                                </span>
                                <ApiPortItem v-for="api in apis" :key="`${api.host}:${api.port}`" :api="api" />
                            </li>
                        </ul>
                    </template>
                </ul>
            </template>
        </ul>
    </div>
</template>
<script setup>
import { getStatu, 状态注册表 } from '../../../globalStatus/index.js';
import ApiPortItem from './ApiPortItem.vue';
import { ref } from 'vue'
// 定义一个API接口的结构
const apiList = getStatu(状态注册表.本地文件搜索接口)
// 定义groupByTypeAndHost函数
function groupByTypeAndHost(apiList) {
    return apiList.reduce((acc, api) => {
        if (!acc[api.type]) {
            acc[api.type] = {};
        }
        if (!acc[api.type][api.host]) {
            acc[api.type][api.host] = [];
        }
        acc[api.type][api.host].push(api);
        return acc;
    }, {});
}

// 使用groupByTypeAndHost函数将apiList组织成树状图
const groupedApiList = ref(groupByTypeAndHost(apiList));

// 定义折叠状态
const typeFoldState = ref({});
const hostFoldState = ref({});

// 切换类型折叠状态
function toggleTypeFold(type) {
    typeFoldState.value[type] = !typeFoldState.value[type];
}

// 切换主机折叠状态
function toggleHostFold(type, host) {
    if (!hostFoldState.value[type]) {
        hostFoldState.value[type] = {};
    }
    hostFoldState.value[type][host] = !hostFoldState.value[type][host];
}

</script>
<style scoped>
.api-list {
    list-style-type: none;
    padding-left: 8px;
}

.api-list__item {
    margin-left: 0;
}

.api-list__type {
    cursor: pointer;
    list-style-type: disc;
}

.api-list__sublist {
    list-style-type: none;
    padding-left: 8px;
}

.api-list__subitem {
    margin-left: 8px;
}

.api-list__host {
    cursor: pointer;
    list-style-type: circle;
}

.api-list__subsublist {
    list-style-type: none;
    padding-left: 8px;
}

.api-list__subsubitem {
    margin-left: 8px;
    list-style-type: square;
}
</style>