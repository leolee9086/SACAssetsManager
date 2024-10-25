import { plugin } from '../../asyncModules.js'
import { setFocus } from '../../utils/DOM/focus.js'
export { setFocus }
window[Symbol.for('sacAssetsStatus')] = window[Symbol.for('sacAssetsStatus')] || {}
const handlePreviousSelection = (event, galleryContainer, currentLayout) => {
    let cardElement = event.target;
    while (!cardElement.getAttribute('data-id')) {
        cardElement = cardElement.parentElement;
        if (cardElement === galleryContainer) break;
    }
    let result = []
    if (cardElement.getAttribute('data-id')) {
        result = [currentLayout.layout.find(item => item.data && item.data.id === cardElement.getAttribute('data-id'))]
    }
    //如果按住了功能键需要用之前的选择进行计算
    if (event.ctrlKey || event.shiftKey) {
        result = result.concat(currentLayout.layout.filter(item => {
            return item.data && item.selected
        }))
    }
    return result
}

// 计算选择框的坐标
export const calculateSelectionCoordinates = (selectionBox, layoutRect, currentLayoutOffsetTop, paddingLR, size) => {
    const { startX, startY, endX, endY } = selectionBox;
    return {
        minX: Math.min(startX, endX) - paddingLR - layoutRect.x,
        maxX: Math.max(startX, endX) - paddingLR - layoutRect.x,
        minY: Math.min(startY, endY) + currentLayoutOffsetTop - layoutRect.y,
        maxY: Math.max(startY, endY) + currentLayoutOffsetTop - layoutRect.y
    };
}

// 处理多选
export const handleMultiSelection = (currentLayout, coordinates, YPositionOnly) => {
    if (!YPositionOnly) {
        return currentLayout.searchByRect(coordinates);
    } else {
        return currentLayout.search(coordinates);
    }
}

// 更新选择状态
export const updateSelectionStatus = (result, event) => {
    result.forEach(data => {
        if (event && event.shiftKey) {
            data.selected = !data.selected;
        } else {
            data.selected = true;
        }
    });
}

export const clearSelectionWithLayout = (currentLayout) => {
    currentLayout.layout.forEach(item => {
        item.selected = false
    })
    plugin.eventBus.emit('assets-select', [])
}
export function diffByEventKey(previousResult, currentResult, event) {
    // 如果没有按下Ctrl或Shift键,直接返回当前结果
    if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
        return currentResult;
    }

    // 如果按下了Ctrl键,合并之前的结果和当前结果
    if (event.ctrlKey) {
        return [...new Set([...previousResult, ...currentResult])];
    }

    if (event.shiftKey) {
        let final = []
        const allItems = [...new Set([...previousResult, ...currentResult])]
        allItems.forEach(
            item => {
                if (previousResult.find(previouSelected => previouSelected.data.id === item.data.id)) {
                    if (!currentResult.find(currentSelected => currentSelected.data.id === item.data.id)) {
                        final.push(item)
                    }
                }
                if (currentResult.find(currentSelected => currentSelected.data.id === item.data.id)) {
                    if (!previousResult.find(previouSelected => previouSelected.data.id === item.data.id)) {
                        final.push(item)
                    }
                }
            }
        )
        return final
    }
    return currentResult
}
export const handlerKeyDownWithLayout = (e, currentLayout, columnCount, scrollContainer) => {
    if (e.target.dataset && e.target.dataset.index >= 0) {
        const index = parseInt(e.target.dataset.index)
        const currentItem = currentLayout.layout.find(item => item && item.index === index)
        let element = scrollContainer.querySelector(`[tabindex="${index}"]`)
        let targetItem = currentItem
        let targetIndex = index
        const isCtrl = e.ctrlKey
        const isShift = e.shiftKey
        console.log(isCtrl, isShift)
        switch (e.key) {
            case 'ArrowUp':
                targetIndex = index - columnCount
                if (targetIndex < 0) {
                    targetIndex = 0
                }
                targetItem = currentLayout.layout.find(item => item && item.index === targetIndex)
                element = scrollContainer.querySelector(`[tabindex="${targetItem.index}"]`)
                break;
            case 'ArrowDown':
                targetIndex = index + columnCount
                if (targetIndex >= currentLayout.layout.length) {
                    targetIndex = currentLayout.layout.length - 1
                }
                targetItem = currentLayout.layout.find(item => item && item.index === targetIndex)
                element = scrollContainer.querySelector(`[tabindex="${targetItem.index}"]`)

                break;
            case 'ArrowLeft':
                targetIndex = index - 1
                if (targetIndex < 0) {
                    targetIndex = 0
                }
                targetItem = currentLayout.layout.find(item => item && item.index === targetIndex)
                element = scrollContainer.querySelector(`[tabindex="${targetItem.index}"]`)

                break;
            case 'ArrowRight':
                targetIndex = index + 1
                if (targetIndex >= currentLayout.layout.length) {
                    targetIndex = currentLayout.layout.length - 1
                }
                targetItem = currentLayout.layout.find(item => item && item.index === targetIndex)
                element = scrollContainer.querySelector(`[tabindex="${targetItem.index}"]`)

                break;
            case 'Enter':
                const asset = currentLayout.layout.find(item => item && item.index === index)
                element = scrollContainer.querySelector(`[tabindex="${targetItem.index}"]`)

                plugin.eventBus.emit(plugin.events.资源界面项目右键, {
                    event: e,
                    assets: currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data),
                    x: element.getBoundingClientRect().left + element.offsetWidth / 2,
                    y: element.getBoundingClientRect().top + element.offsetHeight / 2
                })
                break;
            case 'Escape':
                currentLayout.layout.forEach(item => {
                    item.selected = false
                })
                break;
        }
        if (element) {
            setFocus(element)
        }
        if (targetItem) {
            if (isShift && targetItem !== currentItem) {
                targetItem.selected = !targetItem.selected
            } else {
                targetItem.selected = true
            }
            if (!isCtrl && !isShift) {
                currentLayout.layout.forEach(item => {
                    if (item !== targetItem) {
                        item.selected = false
                    }
                })
            }
        }
        plugin.eventBus.emit('assets-select', currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data))
    }
}

export const startSelectionWithController = (event, controller) => {
    if (controller.isSelecting.value) {
        controller.endSelection(event)
        return
    }
    controller.isSelecting.value = true;
    controller.selectionBox.value.startX = event.x;
    controller.selectionBox.value.startY = event.y;
    controller.selectionBox.value.endX = event.x;
    controller.selectionBox.value.endY = event.y;
    if (event.ctrlKey || event.shiftKey || event.altKey) {
        controller.previousSelectedItem.value = controller.selectedItems.value
    }
}
export const endSelectionWithController =(event,controller)=>{
    controller.isSelecting.value = false;
    controller.selectionBox.value.endX = event.x;
    controller.selectionBox.value.endY = event.y;
}
