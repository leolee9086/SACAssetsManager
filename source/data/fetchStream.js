//使用fetch实现POST请求下的SSE
export function postSSE(uri, data) {
  const eventSource = new EventSource(uri)
  eventSource.onmessage = function (event) {
    console.log(event.data)
  }
}



// 创建可读流
function createReadableStream(response) {
  const reader = response.body.getReader();
  return new ReadableStream({
    start(controller) {
      function push() {
        reader.read().then(({ value, done }) => {
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(new TextDecoder('utf-8').decode(value));
          push();
        });
      }
      push();
    }
  });
}

// 处理单个数据块
function processChunk(chunk, splitedChunk, 回调函数, total, _step, 回调步长) {
  if (splitedChunk) {
    chunk = splitedChunk + chunk;
    splitedChunk = '';
  }
  if (chunk.startsWith('data:')) {
    let _chunk = chunk.substring(5);
    try {
      let json = JSON.parse(_chunk);
      if (json.walkCount !== undefined) {
        if (json.walkCount !== total) {
          total = json.walkCount;
          回调函数('updateTotal', total);
        }
      } else {
        回调函数('pushData', json);
        _step += 1;
      }
      if (_step >= 回调步长) {
        回调函数('stepCallback');
        _step = 0;
      }
    } catch (e) {
      splitedChunk = chunk;
    }
  } else {
    splitedChunk = chunk;
  }
  return { splitedChunk, total, _step };
}

// 读取流数据
function readStream(reader, 回调函数, 回调步长) {
  let splitedChunk = '';
  let total = 0;
  let _step = 0;
  function read() {
    reader.read().then(({ value, done }) => {
      if (done) {
        回调函数('complete');
        console.log('Stream complete');
        return;
      }
      value.split('\n').forEach(chunk => {
        ({ splitedChunk, total, _step } = processChunk(chunk, splitedChunk, 回调函数, total, _step, 回调步长));
      });
      
      read();
    });
  }
  read();
}

// 主函数
export async function applyURIStreamJson(数据接口地址, 回调函数, 回调步长, signal, options = {}) {
  fetch(数据接口地址, { signal, ...options })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok.');
      }
      return createReadableStream(response);
    })
    .then(stream => {
      const reader = stream.getReader();
      readStream(reader, 回调函数, 回调步长);
    })
    .catch(error => { 回调函数('error', error); });
}




/**
 * 创建兼容旧接口的回调函数
 * @param {Array} 推送目标 - 用于存储数据的数组
 * @param {Function} 原回调函数 - 原始的回调函数
 * @param {number} 回调步长 - 回调的步长
 * @returns {Function} 新的兼容回调函数
 */
export function createCompatibleCallback(推送目标, 原回调函数, 回调步长) {
  let _step = 0;
  return function(action, data) {
    switch(action) {
      case 'pushData':
        推送目标.push(data);
        _step++;
        if (_step >= 回调步长) {
          原回调函数 && 原回调函数();
          _step = 0;
        }
        break;
      case 'updateTotal':
        原回调函数 && 原回调函数(data);
        break;
      case 'stepCallback':
        // 这个case可能不需要，因为我们在pushData中已经处理了步长回调
        break;
      case 'complete':
        原回调函数 && 原回调函数();
        break;
      case 'error':
        console.warn(data);
        break;
    }
  };
}

// 兼容旧接口的applyURIStreamJson函数
export async function applyURIStreamJsonCompatible(数据接口地址, 推送目标, 回调函数, 回调步长, signal, options = {}) {
  const compatibleCallback = createCompatibleCallback(推送目标, 回调函数, 回调步长);
  return applyURIStreamJson(数据接口地址, compatibleCallback, 回调步长, signal, options);
}