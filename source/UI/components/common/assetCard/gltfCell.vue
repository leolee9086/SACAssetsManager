<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算素材类型角标(cardData.data) }}
        </div>
        <div class="alt-text" v-if="!modelLoaded" :style="$计算素材缩略图样式">
            <div v-if="!isPlaying" class="play-button" :style="{ height: size + 'px', zIndex: 1 }" @click="handlePlay">
                <i class="play-icon">▶</i>
                <div class="file-size">{{ 格式化文件大小(cardData.data?.size) }}</div>
            </div>
            <img v-if="thumbnailDataUrl && !isPlaying" style="width:100%;height:100%;position:absolute;"
                :src="thumbnailDataUrl" class="thumbnail-img" />


            <div v-if="isPlaying" class="loading-text">加载中...</div>
        </div>
        <div ref="gltfContainer" class="gltf-container"
            :style="modelLoaded && isPlaying ? $计算素材缩略图样式 : placeholderStyle" v-show="isPlaying">

            <canvas @mouseenter="isMouseOver = true" @mouseleave="isMouseOver = false" ref="canvas"
                style="width:100%;height:100%" />
            <!-- 添加光照控制面板 -->
            <div v-if="modelLoaded" class="light-controls">
                <div class="control-item">
                    <label>环境光强度</label>
                    <input type="range" v-model="ambientLightIntensity" min="0" max="2" step="0.1"
                        @input="updateLights" />
                </div>
                <div class="control-item">
                    <label>主光源强度</label>
                    <input type="range" v-model="directionalLightIntensity" min="0" max="2" step="0.1"
                        @input="updateLights" />
                </div>
            </div>

        </div>
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef, shallowRef, defineEmits, ref, onMounted, onBeforeUnmount } from 'vue';
import { 文件系统工具 } from '../../componentUtils.js';
const {格式化文件大小} =文件系统工具
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../../../data/attributies/parseAttributies.js';
import * as THREE from '../../../../../static/three/three.mjs';
import { GLTFLoader } from '../../../../../static/three/addons/loaders/GLTFLoader.js'
import { Sky } from '../../../../../static/three/examples/jsm/objects/Sky.js';
import { OrbitControls } from '../../../../../static/three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from '../../../../../static/three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from '../../../../../static/three/examples/jsm/loaders/OBJLoader.js';
import { ColladaLoader } from '../../../../../static/three/examples/jsm/loaders/ColladaLoader.js';
import { STLLoader } from '../../../../../static/three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from '../../../../../static/three/examples/jsm/loaders/PLYLoader.js';
import { DRACOLoader } from '../../../../../static/three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from '../../../../../static/three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '../../../../../static/three/examples/jsm/libs/meshopt_decoder.module.js';

import { plugin } from '../../../../pluginSymbolRegistry.js';

const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB
const thumbnailDataUrl = ref(null);
const THUMBNAIL_CACHE = Symbol.for('GLTF_THUMBNAIL_CACHE');
// 如果全局缓存不存在则初始化
if (!window[THUMBNAIL_CACHE]) {
    window[THUMBNAIL_CACHE] = new Map();
}
// ... 在script setup中添加获取缓存的方法
const getThumbnailFromCache = () => {
    const cacheKey = cardData.data?.id || cardData.data?.path;
    return cacheKey ? window[THUMBNAIL_CACHE].get(cacheKey) : null;
};
const setThumbnailToCache = (dataUrl) => {
    const cacheKey = cardData.data?.id || cardData.data?.path;
    if (cacheKey) {
        window[THUMBNAIL_CACHE].set(cacheKey, dataUrl);
    }
};
const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showModel', 'showIframe', 'size', 'cellReady']);
const attributeName = toRef(props, 'attributeName');
const displayMode = toRef(props, 'displayMode');
const { cardData } = props;
const size = toRef(props, 'size');
const emit = defineEmits(['cell-ready']);

// 状态变量
const isPlaying = ref(false);
const modelLoaded = ref(false);
const gltfContainer = ref(null);
const canvas = ref(null);
const scene = shallowRef(null);
const camera = shallowRef(null);
const renderer = shallowRef(null);
const controls = shallowRef(null);
const animationFrameId = ref(null);
// 添加光照强度状态
const ambientLightIntensity = ref(0.5);
const directionalLightIntensity = ref(1.0);
const ambientLight = shallowRef(null);
const directionalLight = shallowRef(null);
// 更新光照的方法
const updateLights = () => {
    if (ambientLight.value) {
        ambientLight.value.intensity = ambientLightIntensity.value;
    }
    if (directionalLight.value) {
        directionalLight.value.intensity = directionalLightIntensity.value;
    }
    if (renderer.value && scene.value && camera.value) {
        renderer.value.render(scene.value, camera.value);
    }

};


// 创建一个单独的函数来获取配置好的 GLTFLoader
const createGLTFLoader = (renderer) => {
    const loader = new GLTFLoader();

    // 初始化 DRACOLoader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`/plugins/${plugin.name}/static/three/examples/jsm/libs/draco/`);
    loader.setDRACOLoader(dracoLoader);

    // 初始化 KTX2Loader
    if (renderer) {
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath(`/plugins/${plugin.name}/static/three/examples/jsm/libs/basis/`);
        ktx2Loader.detectSupport(renderer);
        loader.setKTX2Loader(ktx2Loader);
    }
    // 添加 MeshoptDecoder 支持
    loader.setMeshoptDecoder(MeshoptDecoder);

    return loader;
};

const getLoaderByExtension = (src, renderer) => {
    const extension = src.split('.').pop().toLowerCase();
    switch (extension) {
        case 'gltf':
        case 'glb':
            return createGLTFLoader(renderer);
        case 'fbx':
            return new FBXLoader();
        case 'obj':
            return new OBJLoader();
        case 'dae':  // Collada
            return new ColladaLoader();
        case 'stl':
            return new STLLoader();
        case 'ply':
            return new PLYLoader();
        default:
            throw new Error(`不支持的文件格式: ${extension}`);

    }
};

const createDefaultMaterial = () => {
    return new THREE.MeshStandardMaterial({
        color: 0xcccccc,  // 更亮的灰色
        roughness: 0.4,   // 降低粗糙度使表面更光滑
        metalness: 0.5,   // 增加金属感
        envMapIntensity: 1.5,  // 增强环境反射
        flatShading: false     // 平滑着色
    });
};

const handleMaterialErrors = (object) => {
    object.traverse((node) => {
        if (node.isMesh) {
            if (!node.material) {
                node.material = createDefaultMaterial();
                return;
            }

            if (Array.isArray(node.material)) {
                node.material = node.material.map(mat =>
                    mat ? mat : createDefaultMaterial()
                );
            } else {
                const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'];
                maps.forEach(mapType => {
                    if (node.material[mapType] &&
                        (!node.material[mapType].image ||
                            node.material[mapType].image.naturalWidth === 0)) {
                        console.warn(`纹理无效: ${mapType}`);
                        const newMaterial = createDefaultMaterial();
                        Object.assign(newMaterial, {
                            ...node.material,
                            [mapType]: null
                        });
                        node.material = newMaterial;
                    }
                });
            }
        }
    });
};
const debounce = (fn, delay = 500) => {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};
// ... 添加鼠标状态
const isMouseOver = ref(false);

// 场景初始化
const initScene = async () => {
    try {
        const src = await 获取素材属性值(cardData.data, attributeName.value);

        // 初始化渲染器
        renderer.value = new THREE.WebGLRenderer({
            canvas: canvas.value,
            antialias: true,
            alpha: true
        });
        renderer.value.setSize(size.value, size.value);
        renderer.value.setPixelRatio(window.devicePixelRatio);

        // 初始化场景
        scene.value = new THREE.Scene();

        // 设置天空
        const sky = new Sky();
        sky.scale.setScalar(100000);
        scene.value.add(sky);

        const sun = new THREE.Vector3();
        const skyUniforms = sky.material.uniforms;
        skyUniforms['turbidity'].value = 10;
        skyUniforms['rayleigh'].value = 2;
        skyUniforms['mieCoefficient'].value = 0.005;
        skyUniforms['mieDirectionalG'].value = 0.8;

        const phi = THREE.MathUtils.degToRad(90 - 10);
        const theta = THREE.MathUtils.degToRad(180);
        sun.setFromSphericalCoords(10, phi, theta);
        skyUniforms['sunPosition'].value.copy(sun);

        scene.value.background = new THREE.Color(0x87CEEB);

        // 设置相机
        camera.value = new THREE.PerspectiveCamera(75, size.value / size.value, 0.1, 10000);
        camera.value.position.set(0, 0, 15);

        directionalLight.value = new THREE.DirectionalLight(0xffffff, directionalLightIntensity.value);
        directionalLight.value.position.set(5, 10, 7.5);
        scene.value.add(directionalLight.value);

        ambientLight.value = new THREE.AmbientLight(0x404040, ambientLightIntensity.value);
        scene.value.add(ambientLight.value);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.value.add(pointLight);

        // 设置控制器
        controls.value = new OrbitControls(camera.value, renderer.value.domElement);
        controls.value.enableDamping = true;
        controls.value.dampingFactor = 0.25;
        controls.value.enableZoom = true;
        controls.value.zoomSpeed = 1.0;
        const loader = getLoaderByExtension(src,renderer.value);

        // 加载模型
        loader.load(
            src,
            (model) => {
                let object;

                if (model.scene) {
                    // GLTF, FBX等返回场景
                    object = model.scene;
                } else if (model.isGeometry || model.isBufferGeometry) {
                    // STL, PLY等返回几何体
                    const material = createDefaultMaterial()
                    object = new THREE.Mesh(model, material);
                } else {
                    // Collada等其他格式
                    object = model;
                }

                handleMaterialErrors(object);
                scene.value.add(object);
                modelLoaded.value = true;

                // 调整相机位置
                const box = new THREE.Box3().setFromObject(object);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const size = new THREE.Vector3();
                box.getSize(size);

                // 计算模型的最大尺寸
                const maxDim = Math.max(size.x, size.y, size.z);
                // 根据模型大小动态计算相机距离
                const distance = maxDim * 2;
                // 动态调整相机视野
                const fov = 45;
                camera.value.fov = fov;

                // 设置相机位置，确保完整显示模型
                camera.value.position.set(
                    center.x + distance,
                    center.y + distance * 0.5,
                    center.z + distance
                );
                camera.value.lookAt(center);
                camera.value.near = maxDim * 0.01; // 近平面
                camera.value.far = maxDim * 100;   // 远平面
                camera.value.updateProjectionMatrix();

                // 设置控制器目标点为模型中心
                controls.value.target.copy(center);
                controls.value.minDistance = maxDim * 0.5;  // 最小缩放距离
                controls.value.maxDistance = maxDim * 10;   // 最大缩放距离
                controls.value.update();
                renderer.value.render(scene.value, camera.value);

                // 可选：强制触发一次缩略图更新
                if (updateThumbnailCache) {
                    updateThumbnailCache();
                }

                emit('cell-ready', model);
            },
            undefined,
            (error) => {
                console.error('模型加载失败', error);
                modelLoaded.value = false;
                isPlaying.value = false;
            }
        );
        const updateThumbnailCache = debounce(() => {
            if (!canvas.value || !modelLoaded.value || !isMouseOver.value) return;


            try {
                // 确保在当前帧渲染完成后再获取图像
                renderer.value.render(scene.value, camera.value);

                // 直接使用canvas的toDataURL
                const dataUrl = canvas.value.toDataURL('image/png');

                // 创建一个临时Image对象来验证图像是否有效
                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    // 只有当图像成功加载时才缓存
                    if (img.width > 0 && img.height > 0) {
                        setThumbnailToCache(dataUrl);
                    }
                };
            } catch (error) {
                console.warn('缓存缩略图失败:', error);
            }
        }, 1000); // 1秒的防抖延迟

        // 动画循环
        const animate = () => {
            animationFrameId.value = requestAnimationFrame(animate);
            if (modelLoaded.value && controls.value) {
                controls.value.update();
                // 每帧都渲染以确保光照变化能够实时显示
                renderer.value.render(scene.value, camera.value);
                if (isMouseOver.value) {
                    updateThumbnailCache();
                }
            }
        };
        animate();
    } catch (error) {
        console.error('场景初始化失败', error);
        modelLoaded.value = false;
        isPlaying.value = false;
    }
};

// 事件处理
const handlePlay = () => {
    isPlaying.value = true;
    initScene();
};

// 生命周期钩子
onMounted(() => {
    thumbnailDataUrl.value = getThumbnailFromCache();

    if (cardData.size && parseInt(cardData.size) < FILE_SIZE_THRESHOLD) {
        handlePlay();
    }
});

onBeforeUnmount(() => {
    if (modelLoaded.value && renderer.value && canvas.value) {
        try {
            // 在销毁前捕获当前画面
            //   thumbnailDataUrl.value = canvas.value.toDataURL('image/png');
            //  const dataUrl = canvas.value.toDataURL('image/png');
            // setThumbnailToCache(dataUrl);

        } catch (error) {
            console.warn('无法捕获模型预览图:', error);
        }
    }

    if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
    }
    if (controls.value) {
        controls.value.dispose();
    }
    if (renderer.value) {
        renderer.value.dispose();
    }
});


// 计算属性
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
const placeholderStyle = computed(() => ({
    width: `${size.value}px`,
    height: `${size.value}px`,
}));
</script>

<style scoped>
.gltf-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.alt-text {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.8);
    position: relative;
}

.play-button {
    cursor: pointer;
    width: 100%;
    height: auto;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.play-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.play-icon {
    color: white;
    font-size: 24px;
    margin-bottom: 4px;
}

.file-size {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
}

.loading-text {
    color: white;
    font-size: 14px;
}

.thumbnail-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>