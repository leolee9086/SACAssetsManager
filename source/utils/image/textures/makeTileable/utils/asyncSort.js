function createWorkerFunction(func) {
    // 返回一个函数，该函数将参数发送到 Worker，并返回一个 Promise
    return function (array, ...args) {
      // 创建 SharedArrayBuffer 和 Uint32Array
      const sharedBuffer = new SharedArrayBuffer(array.length * Uint32Array.BYTES_PER_ELEMENT);
      const sharedArray = new Uint32Array(sharedBuffer);
      sharedArray.set(array);

      // 将函数体转换为字符串，并创建一个 Worker 脚本
      const workerScript = `
    self.onmessage = function(event) {
      // 调用传入的函数，并将结果发送回主线程
      const sharedArray = new Uint32Array(event.data.sharedBuffer);
      const result = (${func.toString()})(sharedArray, ...event.data.args);
      self.postMessage(result);
      self.close();
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
        // 发送 SharedArrayBuffer 和其他参数到 Worker
        worker.postMessage({ sharedBuffer, args });
      });
    };
  }
  
  export const asyncSort = createWorkerFunction(function (sharedArray) {
    return sharedArray.sort((a, b) => a - b);
  });