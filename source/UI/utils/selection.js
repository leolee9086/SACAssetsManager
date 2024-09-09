import { plugin } from '../../asyncModules.js'
window[Symbol.for('sacAssetsStatus')] = window[Symbol.for('sacAssetsStatus')] || {}
const 全局选择状态 = window[Symbol.for('sacAssetsStatus')]
export const getSelectionStatus = (event, root, currentLayout, currentLayoutOffsetTop, selectionBox, currentLayoutContainer) => {
    const galleryContainer = root.value.querySelector('.gallery_container')
    let result = []
    //处理单选
    let cardElement = event.target
    while (!cardElement.getAttribute('data-id')) {
        cardElement = cardElement.parentElement
        if (cardElement === galleryContainer) {
            break
        }
    }
    if (cardElement.getAttribute('data-id')) {
        result.push(currentLayout.layout.find(item => { return item.data && item.data.id === cardElement.getAttribute('data-id') }))
    }
    //处理多选
    const layoutRect = galleryContainer.getBoundingClientRect()
    const { startX, startY, endX, endY } = selectionBox;
    const minX = Math.min(startX, endX) - layoutRect.x - currentLayoutContainer.style.paddingLeft;
    const maxX = Math.max(startX, endX) - layoutRect.x - currentLayoutContainer.style.paddingLeft;
    const minY = Math.min(startY, endY) + currentLayoutOffsetTop - layoutRect.y;
    const maxY = Math.max(startY, endY) + currentLayoutOffsetTop - layoutRect.y;
    result = result.concat(currentLayout.searchByRect({
        minX,
        minY,
        maxY,
        maxX,
    }))
    result[0] && result.forEach(data => {
        if (event && event.shiftKey) {
            data.selected = undefined
        } else {
            data.selected = true
        }
    });
    return currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data)
}
export const clearSelectionWithLayout = (currentLayout) => {
    currentLayout.layout.forEach(item => {
        item.selected = false
    })
    plugin.eventBus.emit('assets-select', [])
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
            if (isShift) {
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

export {setFocus} from '../../utils/DOM/focus.js'