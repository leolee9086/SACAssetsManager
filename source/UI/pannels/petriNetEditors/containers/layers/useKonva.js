// ... 现有代码 ...

// 将绘图相关的逻辑抽离到单独的 composables
const useKonvaSetup = () => {
    const stage = ref(null);
    const layer = ref(null);
    const gridLayer = ref(null);
    const rulerLayer = ref(null);
  
    const initKonva = (container, parentSize) => {
      stage.value = new Konva.Stage({
        container,
        width: parentSize.width,
        height: parentSize.height
      });
  
      gridLayer.value = new Konva.Layer();
      stage.value.add(gridLayer.value);
  
      rulerLayer.value = new Konva.Layer();
      stage.value.add(rulerLayer.value);
  
      layer.value = new Konva.Layer();
      stage.value.add(layer.value);
    };
  
    return {
      stage,
      layer,
      gridLayer,
      rulerLayer,
      initKonva
    };
  };
  
  // 将连接管理逻辑抽离
  const useConnectionManager = (layer, props, emit) => {
    const currentConnection = ref(null);
    
    const updateConnections = () => {
      // ... 现有的 updateConnections 逻辑 ...
    };
  
    const startConnection = ({ anchor, side, cardID }) => {
      // ... 现有的 startConnection 逻辑 ...
    };
  
    return {
      currentConnection,
      updateConnections,
      startConnection
    };
  };
  
  // 将网格和标尺逻辑抽离
  const useGridAndRulers = (gridLayer, rulerLayer, props) => {
    const drawGrid = () => {
      // ... 现有的 drawGrid 逻辑 ...
    };
  
    const drawRulers = () => {
      // ... 现有的 drawRulers 逻辑 ...
    };
  
    return {
      drawGrid,
      drawRulers
    };
  };