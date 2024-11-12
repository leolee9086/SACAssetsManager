import { loadVueComponentAsNodeSync } from "../../../utils/componentsLoader.js";
import { shallowRef } from "../../../../../static/vue.esm-browser.js";
import { checkInputs, checkOutputs } from "./nodeDefineParser/validators.js";
import { AnchorTypes, Sides, LogTypes, TYPE_MAP, NodeError } from "./nodeDefineParser/types.js";
import { utils as typeUtils } from "./nodeDefineParser/utils.js";
/**
 * 创建锚点控制器
 */
import { createAnchorControllers } from "./nodeDefineParser/controllers/anchor.js";
// 创建柯里化的辅助函数
const 创建卡片输出设置函数 = (anchorControllers, componentName) => (name, value) => {
  const controller = anchorControllers.find(
    c => c.type === AnchorTypes.OUTPUT && c.id === name
  );
  if (controller) {
    controller.setValue(value);
  } else {
    console[LogTypes.WARN](`[${componentName}] 未找到输出锚点: ${name}`);
  }
};
/**
 * 创建运行时控制器
 */
function createRuntimeController(anchorControllers, eventControllers, component, componentName, scope) {
  return {
    setOutput: 创建卡片输出设置函数(anchorControllers,componentName),
    getOutputs: () => {
      return anchorControllers
        .filter(c => c.type === AnchorTypes.OUTPUT)
        .reduce((acc, c) => {
          acc[c.id] = c.value;
          return acc;
        }, {});
    },
    getInput: (name) => {
      const controller = anchorControllers.find(
        c => c.type === AnchorTypes.INPUT && c.id === name
      );
      return controller ? controller.getValue() : undefined;
    },
    getInputs: (inputs, cardInfo, globalInputs, nodeDefine, scope) => {
      //有明确输入,说明是组件定义内部调用直接返回就可以
      if (inputs) {
        cardInfo.savedInputs = { value: inputs }
        return inputs;
      }

      // 检查是否有输入锚点
      const hasInputAnchors = anchorControllers.some(c => c.type === AnchorTypes.INPUT);

      // 无输入锚点的情况
      if (!hasInputAnchors) {
        return handleNoInputAnchors(cardInfo, globalInputs, nodeDefine, scope);
      }

      // 有输入锚点的情况
      return getInputsFromControllers(anchorControllers);
    },
    componentName,
    log: (...args) => console.log(`[${componentName}]`, ...args),
    warn: (...args) => console.warn(`[${componentName}]`, ...args),
    error: (...args) => console.error(`[${componentName}]`, ...args),
    events: eventControllers.reduce((acc, controller) => {
      acc[controller.id] = (value) => controller.emit(value);
      return acc;
    }, {}),
    getEventController: (name) => {
      return eventControllers.find(c => c.id === name);
    },
    getEventControllers: () => eventControllers,
  };
}

/**
 * 创建节点控制器
 */
function createNodeController(anchorControllers, scope, component, componentName, componentProps, componentURL, cardInfo) {
  if (!anchorControllers || !scope || !component) {
    throw new NodeError('创建节点控制器缺少必要参数');
  }

  // 解析事件定义
  const parsedEvents = parseEvents(scope.nodeDefine.events || {}, componentName);
  const eventControllers = createEventControllers(parsedEvents, componentName);
  
  const runtime = createRuntimeController(
    anchorControllers, 
    eventControllers,
    component, 
    componentName, 
    scope
  );

  const { nodeDefine } = scope;
  let process = nodeDefine.process;

  let exec = async (inputs, globalInputs) => {
    try {
      // 验证输入
      const inputControllers = anchorControllers.filter(c => c.type === AnchorTypes.INPUT);
      for (const controller of inputControllers) {
        if (controller.define.required && !controller.getValue()) {
          throw new Error(`缺少必需的输入: ${controller.label || controller.id}`);
        }
      }

      let runtimeInput = runtime.getInputs(inputs, cardInfo, globalInputs, nodeDefine, scope)
      //如果没有输入锚点需要将输入值传递给cardInfo
      if (!inputControllers[0]) {
        cardInfo.runtimeInputValue = runtimeInput
      }

      // 执行处理
      let result = {}
      try {
        result = await process(runtimeInput);

      } catch (e) {
        console.error("处理函数运行出错", cardInfo, componentURL)
      }

      // 处理返回值
      if (result && typeof result === 'object') {
        // 使用 for...of 替换 forEach
        for (const [name, value] of Object.entries(result)) {
          await runtime.setOutput(name, value);
        }
      }
      return result

    } catch (error) {
      runtime.error('执行失败:', error);
      // 重置所有输出
      const outputControllers = anchorControllers.filter(c => c.type === AnchorTypes.OUTPUT);
      for (const controller of outputControllers) {
        await controller.reset();
      }
      throw error;
    }
  }
  nodeDefine.process = exec
  nodeDefine.getRecentOutput = () => {
    return runtime.getOutputs()
  }
  nodeDefine.getRecentInput = () => {
    return runtime.getInputs()
  }
  return {
    cardInfo,
    nodeDefine,
    component: async () => {
      return component
    },
    anchors: [...anchorControllers, ...eventControllers],
    componentProps,
    runtime,
    exec,
    // 重置所有锚点和事件
    reset() {
      anchorControllers.forEach(c => c.reset());
      eventControllers.forEach(c => c.cleanup());
    },
    // 获取锚点或事件控制器
    getAnchor(id) {
      return [...anchorControllers, ...eventControllers].find(c => c.id === id);
    },
    // 获取所有输入控制器
    getInputAnchors() {
      return anchorControllers.filter(c => c.type === AnchorTypes.INPUT);
    },
    // 获取所有输出控制器
    getOutputAnchors() {
      return anchorControllers.filter(c => c.type === AnchorTypes.OUTPUT);
    },
    // 获取所有事件控制器
    getEventAnchors() {
      return eventControllers;
    }
  };
}

export async function parseNodeDefine(componentURL, cardInfo) {
  try {
    const scope = await loadVueComponentAsNodeSync(componentURL).getNodeDefineScope(cardInfo.id);
    // 检查 scope 是否已经被加载过
    if (scope.isLoaded) {
      throw new Error(`scope 已经被加载: ${componentURL}_${cardInfo.id}`);
    }
    // 标记 scope 已加载
    scope.isLoaded = true;

    const component = await loadVueComponentAsNodeSync(componentURL).getComponent(scope);
    const nodeDefine = scope.nodeDefine
    const componentName = new URL(componentURL, window.location.origin).pathname;
    if (!nodeDefine) {
      throw new Error(`组件 ${componentName} 未暴露 nodeDefine`);
    }
    const componentProps = {};
    const parsedInputs = parseInputs(component.props, nodeDefine.inputs, componentName, componentProps, nodeDefine);
    const parsedOutputs = parseOutputs(component.emits, nodeDefine.outputs, componentName, nodeDefine);
    const anchorControllers = createAnchorControllers(parsedInputs, parsedOutputs, nodeDefine, componentProps, cardInfo);
    return createNodeController(anchorControllers, scope, component, componentName, componentProps, componentURL, cardInfo);
  } catch (error) {
    console.error('解析节点定义失败', cardInfo.id, { error })
    throw new NodeError('解析节点定义失败', cardInfo.id, { error });
  }
}

function parseInputs(props, inputs, componentName, componentProps, nodeDefine) {
  const { parsedInputs } = checkInputs(props, inputs, componentName);
  const inputAnchors = Object.entries(parsedInputs)
    .filter(() => nodeDefine.flowType !== 'start')
    .map(([name, def], index, array) => ({
      id: name,
      label: def.label || name,
      define: def,
      type: AnchorTypes.INPUT,
      side: def.side || Sides.LEFT,
      value: shallowRef(def.default),
      position: (index + 1) / (array.length + 1)
    }));

  for (const anchor of inputAnchors) {
    componentProps[anchor.id] = anchor.value;
  }

  return inputAnchors;
}

function parseOutputs(emits, outputs, componentName) {
  const { parsedOutputs } = checkOutputs(emits, outputs, componentName);
  return parsedOutputs.map((output, index, array) => ({
    id: output.name,
    label: output.label || output.name,
    define: output,
    type: AnchorTypes.OUTPUT,
    side: output.side || Sides.RIGHT,
    value: shallowRef(null),
    position: (index + 1) / (array.length + 1)
  }));
}

// 解析事件定义
function parseEvents(events = {}, componentName) {
  const parsedEvents = [];
  
  for (const [name, define] of Object.entries(events)) {
    // 验证事件定义
    if (!define.type) {
      console.warn(`[${componentName}] 事件 ${name} 缺少类型定义`);
      continue;
    }
    
    parsedEvents.push({
      name,
      label: define.label || name,
      description: define.description,
      type: define.type,
      side: define.side || Sides.RIGHT
    });
  }
  
  return parsedEvents;
}

// 创建事件控制器集合
function createEventControllers(events, componentName) {
  return events.map(eventDefine => createEventController(eventDefine, componentName));
}

// 创建事件控制器
const createEventController = (eventDefine, componentName) => {
  let subscribers = new Set();
  
  return {
    id: eventDefine.name,
    label: eventDefine.label || eventDefine.name,
    define: eventDefine,
    type: AnchorTypes.EVENT,
    side: eventDefine.side || Sides.RIGHT,
    value: shallowRef(null),
    
    // 触发事件
    emit(value) {
      this.value.value = value;
      subscribers.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error(`[${componentName}] 事件处理器执行错误:`, error);
        }
      });
    },
    
    // 订阅事件
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    
    // 清理订阅
    cleanup() {
      subscribers.clear();
    }
  };
};

/**
 * 判断输出锚点是否可以连接到输入锚点
 * @param {Object} outputAnchor 输出锚点定义
 * @param {Object} inputAnchor 输入锚点定义
 * @returns {boolean} 是否可以连接
 */
export function linkAble(outputAnchor, inputAnchor) {
  try {
    if (!outputAnchor?.define?.type || !inputAnchor?.define?.type) {
      return true;
    }

    const outputType = typeUtils.normalizeType(outputAnchor.define.type);
    const inputType = typeUtils.normalizeType(inputAnchor.define.type);

    // 如果任一类型为 null (any)，允许连接
    if (!outputType || !inputType) {
      return true;
    }

    // 检查类型兼容性
    const isCompatible = outputType === inputType;

    if (!isCompatible) {
      console.warn(`类型不匹配: ${outputType.name} -> ${inputType.name}`);
    }

    return isCompatible;
  } catch (error) {
    console.error('检查连接兼容性时发生错误:', error);
    return false;
  }
}



function getDefaultInputs(cardInfo, nodeDefine, scope) {
  if (cardInfo.savedInputs) {
    console.log('从保存的输入获取成功')

    return cardInfo.savedInputs.value;
  }

  if (nodeDefine.getDefaultInput) {
    console.log('从节点定义的默认的输入获取成功')

    const result = nodeDefine.getDefaultInput();
    if (result !== undefined) return result;
  }

  if (scope.getDefaultInput) {
    console.log('从节点定义的默认的输入获取成功')

    const result = scope.getDefaultInput();
    if (result !== undefined) return result;
  }

  return undefined;
}

function getInputsFromControllers(anchorControllers) {
  return anchorControllers
    .filter(c => c.type === AnchorTypes.INPUT)
    .reduce((acc, c) => {
      if (c.value !== undefined) {
        acc[c.id] = c.value;
      }
      return acc;
    }, {});
}

// 新增处理无输入锚点的辅助函数
function handleNoInputAnchors(cardInfo, globalInputs, nodeDefine, scope) {
  let inputValue;

  // 1. 优先使用已保存的输入
  if (cardInfo.savedInputs?.value !== undefined) {
    inputValue = cardInfo.savedInputs.value;
    console.log('使用已保存的输入值');
    return inputValue;
  }

  // 2. 其次使用全局输入
  const globalInput = globalInputs[cardInfo.id];
  if (globalInput !== undefined) {
    // 保存全局输入到 savedInputs
    cardInfo.savedInputs = { value: globalInput };
    console.log('使用并保存全局输入值');
    return globalInput;
  }

  // 3. 最后尝试获取默认输入
  inputValue = getDefaultInputs(cardInfo, nodeDefine, scope);
  if (inputValue !== undefined) {
    // 保存默认输入到 savedInputs
    cardInfo.savedInputs = { value: inputValue };
    console.log('使用并保存默认输入值');
  }

  return inputValue;
}