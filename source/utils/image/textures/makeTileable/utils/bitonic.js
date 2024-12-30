
let gpu;
try {
  gpu = new GPU.GPU();
} catch (e) {
  gpu = new GPU();
}


function _mergeSubArray(arr, dir, low, k) {
  const kernel = gpu.createKernel(function (arr, dir, low, k) {
    const i = this.thread.x
    if (i < low) {
      return arr[i]
    }
    if (i >= low && i < low + k) {
      if (dir == (arr[i] > arr[i + k])) {
        return arr[i + k]
      }
    } else {
      return arr[i]
    }

  }, {
    output: [arr.length],
    //   immutable: false
  });
  // Run the kernel
  arr = kernel(arr, dir, low, k);

  // Clean up
  gpu.destroy();
  return arr
}


function mergeSubArray(arr, dir, low, k) {
  for (let i = low; i < low + k; i++) {
    if (dir === (arr[i] > arr[i + k])) {
      [arr[i], arr[i + k]] = [arr[i + k], arr[i]];
    }
  }
  return arr
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
        //  arr= _mergeSubArray(arr, top.dir, top.low, k);
        stack.push({ type: 'merge', low: top.low + k, cnt: k, dir: top.dir });
        stack.push({ type: 'merge', low: top.low, cnt: k, dir: top.dir });
      }
    }
  }

  return arr;
}

function generateRandomArray(size) {
  const arr = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(1024 * Math.random()); // 生成0到100之间的随机数
  }
  return arr;
}


function testBitonicSort(size) {
  const randomData = generateRandomArray(size);
  console.log("Original random data:", randomData);
  const startTime = performance.now();
  const sortedData = gpuBitonicSort(randomData);
  //const sortedData =  randomData.sort((a, b) => a - b)
  const endTime = performance.now();
  console.log("Sorted data:", sortedData);
  console.log(`Sorting took ${endTime - startTime} milliseconds.`);
}

// 测试双调排序函数
testBitonicSort(4096 * 4); // 你可以改变这个值来测试不同大小的数组



const wgslCode = `
struct Uniforms {
  totalElements: u32,
};
@group(0) @binding(0) var<storage, read_write> inputBuffer: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn compareAndSwap(indexA: u32, indexB: u32) {
  let minVal = min(inputBuffer[indexA], inputBuffer[indexB]);
  let maxVal = max(inputBuffer[indexA], inputBuffer[indexB]);
  inputBuffer[indexA] = minVal;
  inputBuffer[indexB] = maxVal;
}
@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index: u32 = global_id.x;
    let totalElements = uniforms.totalElements; // This should be defined based on your buffer size
    for (var step: u32 = 2; step <= totalElements; step <<= 1) {
        for (var stage: u32 = step >> 1; stage > 0; stage >>= 1) {
            let pairIndex = (index ^ stage);
            if (pairIndex > index) {
                if ((index & step) == 0) {
                    if (inputBuffer[index] > inputBuffer[pairIndex]) {
                        compareAndSwap(index, pairIndex);
                    }
                } else {
                    if (inputBuffer[index] < inputBuffer[pairIndex]) {
                        compareAndSwap(index, pairIndex);
                    }
                }
            }
        }
    }
    workgroupBarrier();
}
`
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const data = new Uint32Array([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]); // Example data
async function sort(data) {
  data = new Uint32Array(data)
  const dataLength = new Uint32Array([data.length]);
  const uniformBuffer = device.createBuffer({
    size: dataLength.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true  // 映射缓冲区以便立即写入
  });
  new Uint32Array(uniformBuffer.getMappedRange()).set(dataLength);
  uniformBuffer.unmap();  // 完成映射后取消映射
  const inputBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Uint32Array(inputBuffer.getMappedRange()).set(data);
  inputBuffer.unmap();
  const outputBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage', hasDynamicOffset: false, minBindingSize: 0 }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage', hasDynamicOffset: false, minBindingSize: 0 }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform', hasDynamicOffset: false, minBindingSize: 0 }
      }
    ]
  });
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: inputBuffer
        }
      },
      {
        binding: 1,
        resource: {
          buffer: outputBuffer
        }
      },
      {
        binding: 2,
        resource: {
          buffer: uniformBuffer
        }
      }
    ]
  });
  const shaderModule = device.createShaderModule({
    code: wgslCode // Your WGSL shader code as a string
  });

  const pipeline = device.createComputePipeline({
    compute: {
      module: shaderModule,
      entryPoint: 'main'
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] })
  });
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(256); // Adjust based on your workgroup size and data length
  passEncoder.end();
  const readBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  commandEncoder.copyBufferToBuffer(inputBuffer, 0, readBuffer, 0, data.byteLength);
  await device.queue.submit([commandEncoder.finish()]);
  await device.queue.onSubmittedWorkDone();

  await readBuffer.mapAsync(GPUMapMode.READ);
  const sortedData = new Uint32Array(readBuffer.getMappedRange());
  console.log(sortedData)
  readBuffer.unmap();
  return sortedData
}
console.log(await sort(data))