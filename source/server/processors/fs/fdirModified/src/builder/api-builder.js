import {async,sync} from '../api/index.js'
class APIBuilder {
    root;
    options;
    constructor(root, options) {
        this.root = root;
        this.options = options;
    }
    withPromise() {
        return (0, async.promise)(this.root, this.options);
    }
    withCallback(cb) {
        (0, async.callback)(this.root, this.options, cb);
    }
    sync() {
        return (0, sync.sync)(this.root, this.options);
    }
    stream() {
        return (0, sync.stream)(this.root, this.options);
    }
}
export {APIBuilder}
