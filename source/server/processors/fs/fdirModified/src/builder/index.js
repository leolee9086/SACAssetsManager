"use strict";
import { APIBuilder  } from './api-builder.js'
const path_1 = require("path");
var pm = null;
/* c8 ignore next 6 */
try {
    require.resolve("picomatch");
    pm = require("picomatch");
}
catch (_e) {
    // do nothing
}
class Builder {
    globCache = {};
    options = {
        maxDepth: Infinity,
        suppressErrors: true,
        pathSeparator: path_1.sep,
        filters: [],
    };
    constructor(options) {
        this.options = { ...this.options, ...options };
    }
    withSignal(signal) {
        this.options.signal = signal;
        return this;
    }
    withTimeout(timeout) {
        this.options.timeout = timeout;
        return this;
    }
    group() {
        this.options.group = true;
        return this;
    }
    withPathSeparator(separator) {
        this.options.pathSeparator = separator;
        return this;
    }
    withBasePath() {
        this.options.includeBasePath = true;
        return this;
    }
    withRelativePaths() {
        this.options.relativePaths = true;
        return this;
    }
    withDirs() {
        this.options.includeDirs = true;
        return this;
    }
    withMaxDepth(depth) {
        this.options.maxDepth = depth;
        return this;
    }
    withMaxFiles(limit) {
        this.options.maxFiles = limit;
        return this;
    }
    withFullPaths() {
        this.options.resolvePaths = true;
        this.options.includeBasePath = true;
        return this;
    }
    withErrors() {
        this.options.suppressErrors = false;
        return this;
    }
    withSymlinks() {
        this.options.resolveSymlinks = true;
        return this.withFullPaths();
    }
    withAbortSignal(signal) {
        this.options.signal = signal;
        return this;
    }
    normalize() {
        this.options.normalizePath = true;
        return this;
    }
    filter(predicate) {
        this.options.filters.push(predicate);
        return this;
    }
    onlyDirs() {
        this.options.excludeFiles = true;
        this.options.includeDirs = true;
        return this;
    }
    exclude(predicate) {
        this.options.exclude = predicate;
        return this;
    }
    onlyCounts() {
        this.options.onlyCounts = true;
        return this;
    }
    withIdleCallback(idleOptions={deadline:10,timeout:1000}) {
        this.options.withIdleCallback = true;
        this.options.idleOptions = idleOptions;
        return this;
    }
    crawl(root) {
        return new APIBuilder(root || ".", this.options);
    }
    withCache(cache){
        if(cache&&cache.get&&cache.set){
        this.options.dirCache = cache
        }
        return this
    }
    /**
     * @deprecated Pass options using the constructor instead:
     * ```ts
     * new fdir(options).crawl("/path/to/root");
     * ```
     * This method will be removed in v7.0
     */
    /* c8 ignore next 4 */
    crawlWithOptions(root, options) {
        this.options = { ...this.options, ...options };
        return new api_builder_1.APIBuilder(root || ".", this.options);
    }
    glob(...patterns) {
        return this.globWithOptions(patterns, { dot: true });
    }
    globWithOptions(patterns, options) {
        /* c8 ignore next 5 */
        if (!pm) {
            throw new Error(`Please install picomatch: "npm i picomatch" to use glob matching.`);
        }
        var isMatch = this.globCache[patterns.join("\0")];
        if (!isMatch) {
            isMatch = pm(patterns, options);
            this.globCache[patterns.join("\0")] = isMatch;
        }
        this.options.filters.push((path) => isMatch(path));
        return this;
    }
}
export {Builder as fdir}
