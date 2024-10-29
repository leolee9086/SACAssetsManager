<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算素材类型角标(cardData.data) }}
        </div>
        <div class="alt-text" v-if="!modelLoaded" :style="$计算素材缩略图样式"></div>
        <div ref="gltfContainer" class="gltf-container" :style="modelLoaded ? $计算素材缩略图样式 : placeholderStyle">
            <canvas ref="canvas" style="width:100%;height:100%" />

        </div>
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef, shallowRef, defineEmits, ref, onMounted } from 'vue';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
import { rgb数组转字符串 } from '../../../../utils/color/convert.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../../../data/attributies/parseAttributies.js';
import * as THREE from 'https://esm.sh/v135/three@0.169.0/es2022/three.mjs';
import { GLTFLoader } from 'https://esm.sh/three/addons/loaders/GLTFLoader.js'
import { Sky } from 'https://esm.sh/three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'https://esm.sh/three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://esm.sh/three/examples/jsm/loaders/FBXLoader.js';

const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showModel', 'showIframe', 'size', 'cellReady']);
const attributeName = toRef(props, 'attributeName');
const displayMode = toRef(props, 'displayMode');
const { cardData } = props;
const size = toRef(props, 'size');
const emit = defineEmits(['cell-ready']);
const modelLoaded = ref(false); // 新增状态变量
const gltfContainer = ref(null); // GLTF容器
const canvas = ref(null); // three.js 画布
const scene = shallowRef(null); // 场景实例
const camera = shallowRef(null); // 相机实例
const renderer = shallowRef(null); // 渲染器实例
function getLoaderByExtension(src) {
  const extension = src.split('.').pop().toLowerCase(); // 获取文件扩展名
  switch (extension) {
    case 'gltf':
    case 'glb':
      return new GLTFLoader();
    case 'fbx':
      return new FBXLoader();
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
}
onMounted(async () => {
    // 初始化 three.js 渲染器
        // 加载 GLTF 模型
        const src = await 获取素材属性值(cardData.data, attributeName.value);
        
        const loader = getLoaderByExtension(src);

    renderer.value = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true });
    renderer.value.setSize(size.value, size.value);
    renderer.value.setPixelRatio(window.devicePixelRatio);

    // 创建场景
    scene.value = new THREE.Scene();

    // 创建物理天空
    const sky = new Sky();
    sky.scale.setScalar(10000); // 设置天空的大小
    scene.value.add(sky);

    const sun = new THREE.Vector3();

    // 配置天空参数
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    // 设置太阳的位置
    const phi = THREE.MathUtils.degToRad(90 - 10); // 太阳的高度角
    const theta = THREE.MathUtils.degToRad(180); // 太阳的方位角

    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);

    // 更新场景背景
    scene.value.background = new THREE.Color(0x87CEEB); // 可选：设置背景颜色为晴空蓝

    // 创建相机
    camera.value = new THREE.PerspectiveCamera(75, size.value / size.value, 0.1, 1000);
    camera.value.position.set(0, 0, 15);

    // 创建光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.value.add(directionalLight);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // 环境光
    scene.value.add(ambientLight);

    // 添加点光源
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.value.add(pointLight);
    const controls = new OrbitControls(camera.value, renderer.value.domElement);
    controls.enableDamping = true; // 启用阻尼效果
    controls.dampingFactor = 0.25; // 阻尼系数
    controls.enableZoom = true; // 启用缩放
    controls.zoomSpeed = 1.0; // 缩放速度

    loader.load(
    src,
    (model) => {
        scene.value.add(model.scene||model);
        modelLoaded.value = true;

        // 获取模型的边界框
        const box = new THREE.Box3().setFromObject(model.scene||model);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const size = new THREE.Vector3();
        box.getSize(size);

        // 计算相机应该距离中心点的距离
        const radius = size.length() * 0.5;
        const distance = radius * Math.sqrt(3); // 根据模型大小调整

        // 设置相机位置
        camera.value.position.set(center.x, center.y + distance, center.z + distance);

        // 调整相机朝向
        camera.value.lookAt(center);

        emit('cell-ready', model);
    },
    undefined,
    (error) => {
        console.error('An error happened', error);
    }
);


    // 动画循环
    const animate = () => {
        requestAnimationFrame(animate);
        if (modelLoaded.value) {
            controls.update(); // 仅在模型加载后更新控制
            camera.value.lookAt(scene.value.position);
            renderer.value.render(scene.value, camera.value);
        }
    };
    animate();
});


const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>

<style scoped>
.gltf-container {
    width: 100%;
    height: 100%;
}

.alt-text {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background-color: #000;
}
</style>
