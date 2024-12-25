import { componentManager } from './componentConfig.js';
import { nextTick } from '../../../../static/vue.esm-browser.js';

export class DragDropManager {
    constructor() {
        this.draggedComponentId = null;
        this.updatePreviewCallback = null;
        this.setSelectedComponentCallback = null;
    }

    // 初始化回调函数
    init(updatePreview, setSelectedComponent) {
        this.updatePreviewCallback = updatePreview;
        this.setSelectedComponentCallback = setSelectedComponent;
    }

    // 处理拖拽开始
    handleDragStart(event, component) {
        console.log('Drag start:', component);
        this.draggedComponentId = component.id;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('componentId', component.id);
    }

    // 处理iframe内的拖拽移动
    handleIframeDragOver(data) {
        console.log('Iframe dragover:', data);
    }

    // 处理iframe内的放置
    handleIframeDrop(data, pageComponents) {
        if (!this.draggedComponentId) return;

        const newComponent = componentManager.createComponent(this.draggedComponentId);
        if (!newComponent) return;

        // 查找目标容器并更新组件树
        const updateComponentTree = (components) => {
            for (let i = 0; i < components.length; i++) {
                const component = components[i];
                
                if (component.id === data.containerId) {
                    // 根据放置位置处理
                    switch (data.position) {
                        case 'inside':
                            // 确保容器有 children 数组
                            if (!component.children) {
                                component.children = [];
                            }
                            component.children.push(newComponent);
                            break;
                        case 'before':
                            components.splice(i, 0, newComponent);
                            break;
                        case 'after':
                            components.splice(i + 1, 0, newComponent);
                            break;
                    }
                    return true;
                }
                
                // 递归查找子组件
                if (component.children?.length) {
                    if (updateComponentTree(component.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // 如果没有找到目标容器,则添加到根级别
        if (!data.containerId || !updateComponentTree(pageComponents)) {
            pageComponents.push(newComponent);
        }

        // 更新预览和选中状态
        nextTick(() => {
            this.updatePreviewCallback?.();
            this.setSelectedComponentCallback?.(newComponent);
        });
    }
}

export const dragDropManager = new DragDropManager(); 