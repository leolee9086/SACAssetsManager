const getSelectionStatus = (event, root, currentLayout, currentLayoutOffsetTop, selectionBox, paddingLR, YPositionOnly) => {
    const galleryContainer = root.value.querySelector('.gallery_container');
    let result = [];
    // 处理之前的选择
    result = handlePreviousSelection(event, galleryContainer, currentLayout);

    // 重置所有项的选择状态
    currentLayout.layout.forEach(item => { item.selected = undefined; });
    // 处理多选
    const layoutRect = galleryContainer.getBoundingClientRect();
    const coordinates = calculateSelectionCoordinates(selectionBox, layoutRect, currentLayoutOffsetTop, paddingLR);
    let currentResult = handleMultiSelection(currentLayout, coordinates, YPositionOnly)
    // 更新选择状态
    result = diffByEventKey(result,currentResult,event.ctrlKey,event.shiftKey)
   
    if (result[0]) updateSelectionStatus(result, event);
    return currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data);
}
