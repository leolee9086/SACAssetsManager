const path_1 = require("path");
import * as utils_1 from "../utils.js";
import * as joinPath from "./functions/join-path.js";
import * as pushDirectory from "./functions/push-directory.js";
import * as pushFile from "./functions/push-file.js";
import * as getArray from "./functions/get-array.js";
import * as groupFiles from "./functions/group-files.js";
import * as resolveSymlink from "./functions/resolve-symlink.js";
import * as invokeCallback from "./functions/invoke-callback.js";
import * as walkDirectory from "./functions/walk-directory.js";
import * as queue_1 from "./queue.js";
import * as counter_1 from "./counter.js";
class Walker {
    root;
    isSynchronous;
    state;
    joinPath;
    pushDirectory;
    pushFile;
    getArray;
    groupFiles;
    resolveSymlink;
    walkDirectory;
    callbackInvoker;
    constructor(root, options, callback) {
        this.isSynchronous = !callback;
        this.callbackInvoker = invokeCallback.build(options, this.isSynchronous);
        this.state = {
            // Perf: we explicitly tell the compiler to optimize for String arrays
            signal:options.signal,
            paths: [""].slice(0, 0),
            groups: [],
            counts: new counter_1.Counter(),
            options,
            queue: new queue_1.Queue((error, state) => this.callbackInvoker(state, error, callback)),
        };
        this.root = this.normalizePath(root);
        /*
         * Perf: We conditionally change functions according to options. This gives a slight
         * performance boost. Since these functions are so small, they are automatically inlined
         * by the javascript engine so there's no function call overhead (in most cases).
         */
        this.joinPath = joinPath.build(this.root, options);
        this.pushDirectory = pushDirectory.build(this.root, options);
        this.pushFile = pushFile.build(options);
        this.getArray = getArray.build(options);
        this.groupFiles = groupFiles.build(options);
        this.resolveSymlink = resolveSymlink.build(options, this.isSynchronous);
        this.walkDirectory = walkDirectory.build(this.isSynchronous);
    }
    start() {
        this.walkDirectory(this.state, this.root, this.state.options.maxDepth, this.walk);
        return this.isSynchronous ? this.callbackInvoker(this.state, null) : null;
    }
    normalizePath(path) {
        const { resolvePaths, normalizePath, pathSeparator } = this.state.options;
        const pathNeedsCleaning = (process.platform === "win32" && path.includes("/")) ||
            path.startsWith(".");
        if (resolvePaths)
            path = (0, path_1.resolve)(path);
        if (normalizePath || pathNeedsCleaning)
            path = (0, utils_1.cleanPath)(path);
        if (path === ".")
            return "";
        const needsSeperator = path[path.length - 1] !== pathSeparator;
        return (0, utils_1.convertSlashes)(needsSeperator ? path + pathSeparator : path, pathSeparator);
    }
    walk = (entries, directoryPath, depth) => {
        const { paths, options: { filters, resolveSymlinks, exclude, maxFiles, signal }, } = this.state;
        if ((signal && signal.aborted) || (maxFiles && paths.length > maxFiles))
            return;
        this.pushDirectory(directoryPath, paths, filters);
        const files = this.getArray(this.state.paths);
        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            if (entry.isFile() || (entry.isSymbolicLink() && !resolveSymlinks)) {
                const filename = this.joinPath(entry.name, directoryPath);
                this.pushFile(filename, files, this.state.counts, filters);
            }
            else if (entry.isDirectory()) {
                let path = joinPath.joinDirectoryPath(entry.name, directoryPath, this.state.options.pathSeparator);
                if (exclude && exclude(entry.name, path))
                    continue;
                this.walkDirectory(this.state, path, depth - 1, this.walk);
            }
            else if (entry.isSymbolicLink() && resolveSymlinks) {
                let path = joinPath.joinDirectoryPath(entry.name, directoryPath, this.state.options.pathSeparator);
                this.resolveSymlink(path, this.state, (stat, resolvedPath) => {
                    if (stat.isDirectory()) {
                        resolvedPath = this.normalizePath(resolvedPath);
                        if (exclude && exclude(entry.name, resolvedPath))
                            return;
                        this.walkDirectory(this.state, resolvedPath, depth - 1, this.walk);
                    }
                    else {
                        this.pushFile(resolvedPath, files, this.state.counts, filters);
                    }
                });
            }
        }
        this.groupFiles(this.state.groups, directoryPath, files);
    };
}
export {Walker}
