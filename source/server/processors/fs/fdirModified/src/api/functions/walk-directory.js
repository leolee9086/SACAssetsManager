const fs = require("fs")
const readdirOpts = { withFileTypes: true };
const walkAsync = (state, directoryPath, currentDepth, callback) => {
    state.queue.enqueue();
    if (currentDepth < 0) {
        state.queue.dequeue(null, state);
        return;
    }
    state.counts.directories++;
    // Perf: Node >= 10 introduced withFileTypes that helps us
    // skip an extra fs.stat call.
    fs.readdir(directoryPath || ".", readdirOpts, function process(error, entries = []) {
        callback(entries, directoryPath, currentDepth);
        state.queue.dequeue(state.options.suppressErrors ? null : error, state);
    });
};
const walkSync = (state, directoryPath, currentDepth, callback) => {
    if (currentDepth < 0) {
        return;
    }
    state.counts.directories++;
    let entries = [];
    try {
        entries = fs.readdirSync(directoryPath || ".", readdirOpts);
    }
    catch (e) {
        if (!state.options.suppressErrors)
            throw e;
    }
    callback(entries, directoryPath, currentDepth);
};
function build(isSynchronous) {
    return isSynchronous ? walkSync : walkAsync;
}
export {walkAsync,walkSync,build}