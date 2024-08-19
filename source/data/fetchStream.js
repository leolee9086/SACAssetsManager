/**
 * 从url流式读取csv文件
 * 这里的csv文件是标准的csv文件,每一行一个对象
 * 以,作为分隔符
 * 第一行作为key
 * @param {*} uri 
 * @param {*} lineCallback 
 * @param {*} doneCallback 
 * @param {*} errorCallback 
 * @param {*} step 
 * @param {*} options 
 */
export async function fetchAndStreamCsv(uri, lineCallback, doneCallback, errorCallback, step = 1, options = {}) {
    let stepCounter = 0; // 用于跟踪步数
    let headers = []; // 用于存储CSV头部字段
    let isFirstLine = true; // 标记是否是第一行
  
    fetch(uri, options)
      .then(response => {
        if (response.ok) {
          // 获取响应的可读流
          const reader = response.body.getReader();
          return new ReadableStream({
            start(controller) {
              function push() {
                reader.read().then(({ value, done }) => {
                  if (done) {
                    controller.close();
                    if (isFirstLine) {
                      // 如果流结束时还没有处理任何数据，可能是文件为空
                      errorCallback(new Error('No data received.'));
                    } else {
                      doneCallback && doneCallback();
                    }
                    return;
                  }
                  // 将每个文件信息推送到流中
                  const decodedValue = new TextDecoder('utf-8').decode(value);
                  controller.enqueue(decodedValue);
                  push(); // 继续读取下一部分
                });
              }
              push();
            }
          });
        } else {
          throw new Error('Network response was not ok.');
        }
      })
      .then(stream => {
        // 使用流式处理读取数据
        const streamReader = stream.getReader();
        function read() {
          streamReader.read().then(({ value, done }) => {
            if (done) {
              console.log('Stream complete');
              return;
            }
            // 按行分割字符串
            const lines = value.split('\n').filter(line => line); // 过滤掉空行
            lines.forEach(line => {
              if (isFirstLine) {
                // 解析CSV头部
                headers = line.split(',');
                isFirstLine = false;
              } else {
                // 解析数据行
                const columns = line.split(',');
                const dataObj = headers.reduce((obj, header, index) => {
                  obj[header] = columns[index];
                  return obj;
                }, {});
                lineCallback(dataObj); // 调用行回调函数
                stepCounter++; // 步数递增
                if (stepCounter % step === 0) {
                  // 达到步数后执行回调
                  lineCallback(null); // 传递null表示这是步数回调
                  stepCounter = 0; // 重置步数计数器
                }
              }
            });
            // 继续读取
            read();
          });
        }
        read();
      })
      .catch(error => {
        errorCallback(error); // 调用错误回调
      });
  }

/**
 * 这里存储的json对象不是标准的json形式,而是json字符串,每一行一个json对象
 * @param {*} uri 
 * @param {*} target 
 * @param {*} callback 
 * @param {*} step 
 * @param {*} signal 
 * @param {*} options 
 */
export async function applyURIStreamJson(uri, target, callback, step, signal,options={}   ) {
    let _step = 0;
    fetch(uri, { signal, ...options })
    .then(response => {
        if (response.ok) {
            // 获取响应的可读流
            const reader = response.body.getReader();
            return new ReadableStream({
                start(controller) {
                    function push() {
                        reader.read().then(({ value, done }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            // 将每个文件信息推送到流中
                            controller.enqueue(new TextDecoder('utf-8').decode(value));
                            push(); // 继续读取下一部分
                        });
                    }
                    push();
                }
            });
        } else {
            throw new Error('Network response was not ok.');
        }
    })
    .then(stream => {
        // 使用流式处理读取数据
        const reader = stream.getReader();
        read()
        let splitedChunk
        function read() {
            reader.read().then(({ value, done }) => {
                console.log(value)
                if (done) {
                    callback && callback()
                    console.log('Stream complete');
                    return;
                }
                value.split('\n').forEach(chunk => {
                    try {
                        splitedChunk ? target.push(JSON.parse(splitedChunk + chunk)) : target.push(JSON.parse(chunk))
                        _step += 1
                        if (_step >= step) {
                            callback && callback()
                            _step = 0
                        }
                        splitedChunk = undefined
                    } catch (e) {
                        splitedChunk = chunk
                    }
                });
                // 处理文件信息
                // 继续读取
                read();
            })
        }
    }).catch(error => { console.warn(error) })
}

