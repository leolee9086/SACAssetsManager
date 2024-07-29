export class DataStreamHandler {
    constructor(options, callback) {
      this.options = options;
      this.callback = callback;
      this.signal = options.signal || null;
      this.reader = null;
      this.stream = null;
      this.isDone = false;
    }
  
    async fetchData() {
      try {
        const response = await fetch(this.options.url, {
          method: this.options.method,
          body: this.options.body,
          headers: this.options.headers,
          signal: this.signal,
        });
  
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
  
        this.stream = new ReadableStream({
          start(controller) {
            const reader = response.body.getReader();
            function push() {
              reader.read().then(({ value, done }) => {
                if (done) {
                  controller.close();
                  this.callback.onComplete();
                  return;
                }
                controller.enqueue(value);
                push();
              });
            }
            push();
          }
        });
  
        this.reader = this.stream.getReader();
        this.processStream();
      } catch (error) {
        this.callback.onError(error);
      }
    }
  
    processStream() {
      const onData = this.callback.onData || (() => {});
      const onProgress = this.callback.onProgress || (() => {});
      let buffer = new Uint8Array();
  
      function read() {
        this.reader.read().then(({ value, done }) => {
          if (done) {
            this.isDone = true;
            this.callback.onComplete();
            return;
          }
  
          buffer = new Uint8Array([...buffer, ...value]);
          onProgress();
  
          // Process buffer or pass to onData callback
          onData(buffer);
  
          read();
        });
      }
  
      read();
    }
  
    cancel() {
      if (this.signal) {
        this.signal.abort();
      }
    }
  }