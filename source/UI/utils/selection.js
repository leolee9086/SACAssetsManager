
window[Symbol.for('sacAssetsStatus')]=window[Symbol.for('sacAssetsStatus')]||{}
const 全局选择状态 = window[Symbol.for('sacAssetsStatus')]
export const getSelectionStatus = (envet,root,currentLayout,currentLayoutOffsetTop,selectionBox,currentLayoutContainer) => {
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
        }else{
            data.selected = true
        }
    });
    return currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data)
}
export const handlerKeyDownWithLayout=(e,currentLayout,columnCount,scrollContainer)=>{
    const index =parseInt( e.target.dataset.index)
    let element
    let layoutPre
    let layoutNext
    const isCtrl=e.ctrlKey
    const isShift=e.shiftKey
    switch (e.key) {
        case 'ArrowUp':
            layoutPre = currentLayout.layout.find(item =>item&& item.index === index - columnCount)
            element = scrollContainer.querySelector(`[tabindex="${layoutPre.index}"]`)
            if(isShift){
                
            }
            element.focus()
            break;
        case 'ArrowDown':
            layoutNext = currentLayout.layout.find(item => item && item.index === index + columnCount)
            element = scrollContainer.querySelector(`[tabindex="${layoutNext.index}"]`)
            element.focus()
            break;
        case 'ArrowLeft':
             layoutPre = currentLayout.layout.find(item => item && item.index === index - 1)
            element = scrollContainer.querySelector(`[tabindex="${layoutPre.index}"]`)
            element.focus()
            break;
        case 'ArrowRight':
             layoutNext = currentLayout.layout.find(item => item && item.index === index + 1)
            element = scrollContainer.querySelector(`[tabindex="${layoutNext.index}"]`)
            element.focus()
            break;
        case 'Enter':
            const asset =currentLayout.layout.find(item => item && item.index === index)
            asset.selected=!asset.selected
            break;
        case 'Escape':
            currentLayout.layout.forEach(item => {
                item.selected = false
            })
        break;
    }

}