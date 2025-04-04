import { brushConfigs, createToolButtonConfigs } from "../../../../../src/utils/canvas/draw/brushes/configs.js"
import { DrawingTools } from "../../../../../src/utils/canvas/draw/index.js"
const createCanvas=(width,height)=>{
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.border = '1px solid #ccc'
    canvas.style.backgroundColor = '#fff'
    return canvas
}
export function initDrawingTest(containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
        console.error('找不到容器:', containerId)
        return
    }
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '10px'
    container.style.padding = '20px'
    const canvas = createCanvas(4096,1960)
    container.appendChild(canvas)
    const drawingTools = new DrawingTools(canvas)
    const toolbar = document.createElement('div')
    toolbar.style.display = 'flex'
    toolbar.style.gap = '10px'
    container.appendChild(toolbar)
    const tools = createToolButtonConfigs()
    let currentTool = tools[0]
    let currentColor = currentTool.color
    tools.forEach(tool => {
        const button = document.createElement('button')
        button.textContent = tool.label
        button.style.padding = '8px 16px'
        button.style.cursor = 'pointer'

        button.addEventListener('click', () => {
            drawingTools.setTool(tool.name);  // 使用新的setTool方法
            colorPicker.value = drawingTools.currentColor;  // 更新颜色选择器的值
        })
        toolbar.appendChild(button)
    })
    const colorPicker = document.createElement('input')
    colorPicker.type = 'color'
    colorPicker.value = currentColor
    colorPicker.onchange = (e) => {
        drawingTools.currentColor = e.target.value;
        drawingTools.clearBrushCache();  // 除缓存以重新生成画笔
    }
    toolbar.appendChild(colorPicker)
    const sizeSlider = document.createElement('input')
    sizeSlider.type = 'range'
    sizeSlider.min = '0.5'
    sizeSlider.max = '30'
    sizeSlider.step = '0.01'
    sizeSlider.value = '1'
    sizeSlider.onchange = (e) => {
        const newSize = parseFloat(e.target.value);
        drawingTools.currentSize = newSize;  // 直接更新 drawingTools 的状态
    }
    toolbar.appendChild(sizeSlider)
    const clearButton = document.createElement('button')
    clearButton.textContent = '清除画布'
    clearButton.style.padding = '8px 16px'
    clearButton.style.cursor = 'pointer'
    clearButton.addEventListener('click', () => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    toolbar.appendChild(clearButton)
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.01';
    opacitySlider.value = '1';
    opacitySlider.onchange = (e) => {
        drawingTools.setOpacity(parseFloat(e.target.value));
    };
    toolbar.appendChild(opacitySlider);
    const blendModeSelect = document.createElement('select');
    blendModeSelect.style.padding = '8px';
    drawingTools.blendModes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        option.textContent = mode;
        if (mode === 'source-over') {
            option.selected = true;
        }
        blendModeSelect.appendChild(option);
    });
    blendModeSelect.onchange = (e) => {
        drawingTools.setBlendMode(e.target.value);
    };
    const blendModeLabel = document.createElement('label');
    blendModeLabel.textContent = '混合模式：';
    blendModeLabel.style.display = 'flex';
    blendModeLabel.style.alignItems = 'center';
    blendModeLabel.style.gap = '5px';
    blendModeLabel.appendChild(blendModeSelect);
    toolbar.appendChild(blendModeLabel);
    const predictContainer = document.createElement('div');
    predictContainer.style.display = 'flex';
    predictContainer.style.alignItems = 'center';
    predictContainer.style.gap = '5px';
    const predictSwitch = document.createElement('input');
    predictSwitch.type = 'checkbox';
    predictSwitch.id = 'predictSwitch';
    predictSwitch.checked = false;
    const predictLabel = document.createElement('label');
    predictLabel.htmlFor = 'predictSwitch';
    predictLabel.textContent = '引用预测点优化';
    predictSwitch.onchange = (e) => {
        drawingTools.usePredictedPoints = e.target.checked;
    };
    predictContainer.appendChild(predictSwitch);
    predictContainer.appendChild(predictLabel);
    toolbar.appendChild(predictContainer);
    return {
        canvas,
        drawingTools,
        clear: () => drawingTools.clearCanvas()
    }
}
initDrawingTest('app')