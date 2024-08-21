function joinPathWithBasePath(filename, directoryPath) {
    return directoryPath + filename;
}
function joinPathWithRelativePath(root) {
    return function (filename, directoryPath) {
        return directoryPath.substring(root.length) + filename;
    };
}
function joinPath(filename) {
    return filename;
}
function joinDirectoryPath(filename, directoryPath, separator) {
    return directoryPath + filename + separator;
}
function build(root, options) {
    const { relativePaths, includeBasePath } = options;
    return relativePaths && root
        ? joinPathWithRelativePath(root)
        : includeBasePath
            ? joinPathWithBasePath
            : joinPath;
}
export {joinPathWithBasePath,joinPathWithRelativePath,joinPath,joinDirectoryPath,build}