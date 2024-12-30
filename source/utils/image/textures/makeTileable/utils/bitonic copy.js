import { withPerformanceLogging } from "../../functionAndClass/performanceRun.js";
import { NaiveBitonicCompute } from "./NaiveBitonicComputeFrag.js"
const StepEnum = {
  "NONE": 0,
  "FLIP_LOCAL": 1,
  "DISPERSE_LOCAL": 2,
  "FLIP_GLOBAL": 3,
  "DISPERSE_GLOBAL": 4,
}

const maxElementsLimit = 134217728 / 4 / 2;

function compute(inputElements) {
  return new Promise(async (resolve, reject) => {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const maxInvocationsX = device.limits.maxComputeWorkgroupSizeX;

    let highestBlockHeight = 2;

    let length = inputElements.length;
    length--;
    length |= length >> 1;
    length |= length >> 2;
    length |= length >> 4;
    length |= length >> 8;
    length |= length >> 16;
    length++;
    // 取较小的值：计算得到的2的幂或maxElementsLimit
    const maxElements = Math.min(length, maxElementsLimit);
    let paddedInputElements = new Uint32Array(maxElements);
    // 将原始inputElements的内容复制到新数组中
    paddedInputElements.set(inputElements);
    paddedInputElements.fill(0xFFFFFFFF, inputElements.length);
    const defaultGridWidth =
      Math.sqrt(maxElements) % 2 === 0
        ? Math.floor(Math.sqrt(maxElements))
        : Math.floor(Math.sqrt(maxElements / 2));
    const defaultGridHeight = maxElements / defaultGridWidth;
    const totalElementOptions = [];
    const getNumSteps = (numElements) => {
      const n = Math.log2(numElements);
      return (n * (n + 1)) / 2;
    };
    for (let i = maxElements; i >= 4; i /= 2) {
      totalElementOptions.push(i);
    }
    const settings = {
      // TOTAL ELEMENT AND GRID SETTINGS
      // The number of elements to be sorted. Must equal gridWidth * gridHeight || Workgroup Size * Workgroups * 2.
      // When changed, all relevant values within the settings object are reset to their defaults at the beginning of a sort with n elements.
      'Total Elements': maxElements,
      // The width of the screen in cells.
      'Grid Width': defaultGridWidth,
      // The height of the screen in cells.
      'Grid Height': defaultGridHeight,
      // Grid Dimensions as string
      'Grid Dimensions': `${defaultGridWidth}x${defaultGridHeight}`,

      // INVOCATION, WORKGROUP SIZE, AND WORKGROUP DISPATCH SETTINGS
      // The size of a workgroup, or the number of invocations executed within each workgroup
      // Determined algorithmically based on 'Size Limit', maxInvocationsX, and the current number of elements to sort
      'Workgroup Size': maxInvocationsX,
      // An artifical constraint on the maximum workgroup size/maximumn invocations per workgroup as specified by device.limits.maxComputeWorkgroupSizeX
      'Size Limit': maxInvocationsX,
      // Total workgroups that are dispatched during each step of the bitonic sort
      'Workgroups Per Step': 65535,

      // HOVER SETTINGS
      // The element/cell in the element visualizer directly beneath the mouse cursor
      'Hovered Cell': 0,
      // The element/cell in the element visualizer that the hovered cell will swap with in the next execution step of the bitonic sort.
      'Swapped Cell': 1,

      // STEP INDEX, STEP TYPE, AND STEP SWAP SPAN SETTINGS
      // The index of the current step in the bitonic sort.
      'Step Index': 0,
      // The total number of steps required to sort the displayed elements.
      'Total Steps': getNumSteps(maxElements),
      // A string that condenses 'Step Index' and 'Total Steps' into a single GUI Controller display element.
      'Current Step': `0 of 91`,
      // The category of the previously executed step. Always begins the bitonic sort with a value of 'NONE' and ends with a value of 'DISPERSE_LOCAL'
      'Prev Step': 'NONE',
      // The category of the next step that will be executed. Always begins the bitonic sort with a value of 'FLIP_LOCAL' and ends with a value of 'NONE'
      'Next Step': 'FLIP_LOCAL',
      // The maximum span of a swap operation in the sort's previous step.
      'Prev Swap Span': 0,
      // The maximum span of a swap operation in the sort's upcoming step.
      'Next Swap Span': 2,

      // ANIMATION LOOP AND FUNCTION SETTINGS
      // A flag that designates whether we will dispatch a workload this frame.
      executeStep: true,
      // A function that randomizes the values of each element.
      // When called, all relevant values within the settings object are reset to their defaults at the beginning of a sort with n elements.
      'Randomize Values': () => {
        return;
      },
      // A function that manually executes a single step of the bitonic sort.
      'Execute Sort Step': () => {
        return;
      },
      // A function that logs the values of each element as an array to the browser's console.
      'Log Elements': () => {
        return;
      },
      // A function that automatically executes each step of the bitonic sort at an interval determined by 'Auto Sort Speed'
      'Auto Sort': () => {
        return;
      },
      // The speed at which each step of the bitonic sort will be executed after 'Auto Sort' has been called.
      'Auto Sort Speed': 50,

      // MISCELLANEOUS SETTINGS
      'Display Mode': 'Elements',
      // An atomic value representing the total number of swap operations executed over the course of the bitonic sort.
      'Total Swaps': 0,

      // TIMESTAMP SETTINGS
      // NOTE: Timestep values below all are calculated in terms of milliseconds rather than the nanoseconds a timestamp query set usually outputs.
      // Time taken to execute the previous step of the bitonic sort in milliseconds
      'Step Time': '0ms',
      stepTime: 0,
      // Total taken to colletively execute each step of the complete bitonic sort, represented in milliseconds.
      'Sort Time': '0ms',
      sortTime: 0,
      // Average time taken to complete a bitonic sort with the current combination of n 'Total Elements' and x 'Size Limit'
      'Average Sort Time': '0ms',
      // A string to number map that maps a string representation of the current 'Total Elements' + 'Size Limit' configuration to a number
      // representing the total number of sorts that have been executed under that same configuration.
      configToCompleteSwapsMap: {
        '8192 256': {
          sorts: 0,
          time: 0,
        },
      },
      // Current key into configToCompleteSwapsMap
      configKey: '8192 256',
    };

    // Initialize elementsBuffer and elementsStagingBuffer
    const elementsBufferSize =
      Float32Array.BYTES_PER_ELEMENT * totalElementOptions[0];
    // Initialize input, output, staging buffers
    const elementsInputBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const elementsOutputBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const elementsStagingBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    // Initialize atomic swap buffer on GPU and CPU. Counts number of swaps actually performed by
    // compute shader (when value at index x is greater than value at index y)
    const atomicSwapsOutputBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const atomicSwapsStagingBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Create uniform buffer for compute shader
    const computeUniformsBuffer = device.createBuffer({
      // width, height, blockHeight, algo
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const shaderCode = NaiveBitonicCompute(Math.min(settings['Total Elements'] / 2, settings['Size Limit']));
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: elementsInputBuffer } },
        { binding: 1, resource: { buffer: elementsOutputBuffer } },
        { binding: 2, resource: { buffer: computeUniformsBuffer } },
        { binding: 3, resource: { buffer: atomicSwapsOutputBuffer } }
      ]
    });
    const computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'computeMain' }
    });
    // Write elements buffer
    device.queue.writeBuffer(
      elementsInputBuffer,
      0,
      paddedInputElements.buffer,
      paddedInputElements.byteOffset,
      paddedInputElements.byteLength
    );
    let currentSetp = 0
    currentSetp += 1

    async function frame() {
      const dims = new Float32Array([
        maxElements,
        maxElements,
      ]);
      device.queue.writeBuffer(
        computeUniformsBuffer,
        0,
        dims.buffer,
        dims.byteOffset,
        dims.byteLength
      );
      const commandEncoder = device.createCommandEncoder();
      let computePassEncoder = commandEncoder.beginComputePass();
      computePassEncoder.setPipeline(computePipeline);
      computePassEncoder.setBindGroup(0, bindGroup);
      computePassEncoder.dispatchWorkgroups(settings['Workgroups Per Step']);
      computePassEncoder.end();

      const stepDetails = new Uint32Array([
        StepEnum[settings['Next Step']],
        settings['Next Swap Span'],
      ]);

      device.queue.writeBuffer(computeUniformsBuffer, 8, stepDetails);
      if (
        highestBlockHeight < settings['Total Elements'] * 2
      ) {
        settings['Step Index'] = settings['Step Index'] + 1;
        settings['Next Swap Span'] = settings['Next Swap Span'] / 2
        // console.log(settings['Next Step'], highestBlockHeight, settings['Step Index'], settings['Next Swap Span'])
        // Each cycle of a bitonic sort contains a flip operation followed by multiple disperse operations
        // Next Swap Span will equal one when the sort needs to begin a new cycle of flip and disperse operations
        if (settings['Next Swap Span'] === 1) {
          // The next cycle's flip operation will have a maximum swap span 2 times that of the previous cycle
          highestBlockHeight *= 2;

          if (highestBlockHeight === settings['Total Elements'] * 2) {
            // The next cycle's maximum swap span exceeds the total number of elements. Therefore, the sort is over.
            // Accordingly, there will be no next step.
            // And if there is no next step, then there are no swaps, and no block range within which two elements are swapped.
            // Finally, with our sort completed, we can increment the number of total completed sorts executed with n 'Total Elements'
            // and x 'Size Limit', which will allow us to calculate the average time of all sorts executed with this specific
            // configuration of compute resources
            settings['Next Step'] = 'NONE'
            settings['Next Swap Span'] = 0
          } else if (highestBlockHeight > settings['Workgroup Size'] * 2) {
            // The next cycle's maximum swap span exceeds the range of a single workgroup, so our next flip will operate on global indices.
            settings['Next Step'] = 'FLIP_GLOBAL'
            settings['Next Swap Span'] = highestBlockHeight
          } else {
            settings['Next Step'] = 'FLIP_LOCAL'
            settings['Next Swap Span'] = highestBlockHeight

            // The next cycle's maximum swap span can be executed on a range of indices local to the workgroup.
          }
        } else {
          settings['Next Swap Span'] > settings['Workgroup Size'] * 2
            ? settings['Next Step'] = 'DISPERSE_GLOBAL'
            : settings['Next Step'] = 'DISPERSE_LOCAL';
          // Otherwise, execute the next disperse operation
        }
      }

      if (
        highestBlockHeight < settings['Total Elements'] * 4
      ) {
        if (!settings['Next Swap Span']) {
          // Copy GPU accessible buffers to CPU accessible buffers
          commandEncoder.copyBufferToBuffer(
            elementsOutputBuffer,
            0,
            elementsStagingBuffer,
            0,
            elementsBufferSize
          );

          device.queue.submit([commandEncoder.finish()]);
          // Copy GPU element data to CPU

          await elementsStagingBuffer.mapAsync(
            GPUMapMode.READ,
            0,
            elementsBufferSize
          );
          const copyElementsBuffer = elementsStagingBuffer.getMappedRange(
            0,
            elementsBufferSize
          );
          const elementsData = copyElementsBuffer.slice(
            0,
            Uint32Array.BYTES_PER_ELEMENT * settings['Total Elements']
          );
          // Extract data
          const elementsOutput = new Uint32Array(elementsData);
          elementsStagingBuffer.unmap();
          atomicSwapsStagingBuffer.unmap();
          // Elements output becomes elements input, swap accumulate
          resolve(elementsOutput)
          return
        }
        // Copy output buffer to input buffer for the next step

      }
      commandEncoder.copyBufferToBuffer(
        elementsOutputBuffer,
        0,
        elementsInputBuffer,
        0,
        elementsBufferSize
      );
      frame()
    }
    frame();
  })
}
function gpuBitonicSort(arr) {
  const n = arr.length;

  let stack = [{ type: 'sort', low: 0, cnt: n, dir: true }];
  while (stack.length > 0) {
    let top = stack.pop();

    if (top.cnt > 1) {
      if (top.type === 'sort') {
        let k = Math.floor(top.cnt / 2);
        stack.push({ type: 'merge', low: top.low, cnt: top.cnt, dir: top.dir });
        stack.push({ type: 'sort', low: top.low + k, cnt: k, dir: false });
        stack.push({ type: 'sort', low: top.low, cnt: k, dir: true });
      } else if (top.type === 'merge') {
        let k = Math.floor(top.cnt / 2);
        for (let i = top.low; i < top.low + k; i++) {
          if (top.dir === (arr[i] > arr[i + k])) {
            [arr[i], arr[i + k]] = [arr[i + k], arr[i]];
          }
        }
        stack.push({ type: 'merge', low: top.low + k, cnt: k, dir: top.dir });
        stack.push({ type: 'merge', low: top.low, cnt: k, dir: top.dir });
      }
    }
  }

  return arr;
}


function measurePerformance() {
  // 已有的初始化数据
  let elementsGPU =new  Uint32Array(Array.from(
   {length:4096},(_,i)=>{return Math.random()*4096}
  ));

  // 复制数据以用于原生排序方法
  let elementsNative = Uint32Array.from(elementsGPU);
  let elementsGpujs = Uint32Array.from(elementsGPU);

  // 性能测量函数
  async function _measurePerformance() {
    console.log('start')
    // GPU 加速方法
    const startGPU = performance.now();
    console.log(await compute(elementsGPU));
    const endGPU = performance.now();
    console.log(`GPU Accelerated Method Time: ${endGPU - startGPU} ms`);
    console.log(withPerformanceLogging(gpuBitonicSort)(elementsGpujs))
    // 原生排序方法
    const startNative = performance.now();
    elementsNative.sort((a, b) => a - b);
    console.log(elementsNative);

    const endNative = performance.now();
    console.log(`Native Sort Method Time: ${endNative - startNative} ms`);
  }
  _measurePerformance()
}


measurePerformance();
function _bitonicSort(arr) {
  const n = arr.length;

  let stack = [{ type: 'sort', low: 0, cnt: n, dir: true }];
  while (stack.length > 0) {
    let top = stack.pop();

    if (top.cnt > 1) {
      if (top.type === 'sort') {
        let k = Math.floor(top.cnt / 2);
        stack.push({ type: 'merge', low: top.low, cnt: top.cnt, dir: top.dir });
        stack.push({ type: 'sort', low: top.low + k, cnt: k, dir: false });
        stack.push({ type: 'sort', low: top.low, cnt: k, dir: true });
      } else if (top.type === 'merge') {
        let k = Math.floor(top.cnt / 2);
        for (let i = top.low; i < top.low + k; i++) {
          if (top.dir === (arr[i] > arr[i + k])) {
            [arr[i], arr[i + k]] = [arr[i + k], arr[i]];
          }
        }
        stack.push({ type: 'merge', low: top.low + k, cnt: k, dir: top.dir });
        stack.push({ type: 'merge', low: top.low, cnt: k, dir: top.dir });
      }
    }
  }

  return arr;
}

function createWorkerFunction(func) {

  // 返回一个函数，该函数将参数发送到 Worker，并返回一个 Promise
  return function (...args) {
    // 将函数体转换为字符串，并创建一个 Worker 脚本
    const workerScript = `
  self.onmessage = function(event) {
    // 调用传入的函数，并将结果发送回主线程
    const result = (${func.toString()})(...event.data);
    self.postMessage(result);
    self.close() 
  };
  //${Math.random()}
`;
    // 创建一个 Blob 对象，其中包含上面的 Worker 脚本
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    // 创建一个新的 Worker
    const worker = new Worker(url);

    return new Promise((resolve, reject) => {
      worker.onmessage = function (event) {
        resolve(event.data);
      };
      worker.onerror = function (error) {
        reject(error);
      };
      worker.postMessage(args);
    });
  };
}
function generateRandomArray(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10000));
}

// 包装数组排序函数
const asyncSort = createWorkerFunction(function (array) {
  return array.sort((a, b) => a - b);
});


async function performConcurrentSorts(numArrays, arrayLength) {
  // 生成随机数组
  const arrays = Array.from({ length: numArrays }, () => generateRandomArray(arrayLength));
  // 开始计时
  const startTime = performance.now();
  // 创建并发排序任务
  const sortPromises = arrays.map(array => asyncSort(array));
  // 等待所有排序完成
  const sortedArrays = await Promise.all(sortPromises);

  // 结束计时
  const endTime = performance.now();

  // 输出执行时间
  console.log(`Total time for sorting ${numArrays} arrays of length ${arrayLength}: ${endTime - startTime} ms`);

  return sortedArrays;
}

// 执行并发排序
performConcurrentSorts(3, 4096*4096).then(sortedArrays => {
  console.log('All arrays sorted.');
}).catch(error => {
  console.error('Error during sorting:', error);
});