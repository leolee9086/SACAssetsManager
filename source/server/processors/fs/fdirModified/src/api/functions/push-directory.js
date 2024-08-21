function pushDirectoryWithRelativePath(root) {
    return function (directoryPath, paths) {
        paths.push((directoryPath || ".").substring(root.length));
    };
}
function pushDirectoryFilterWithRelativePath(root) {
    return function (directoryPath, paths, filters) {
        const relativePath = directoryPath.substring(root.length);
        if (filters.every((filter) => filter(relativePath, true))) {
            paths.push(relativePath);
        }
    };
}
const pushDirectory = (directoryPath, paths) => {
    paths.push(directoryPath || ".");
};
const pushDirectoryFilter = (directoryPath, paths, filters) => {
    if (filters.every((filter) => filter(directoryPath, true))) {
        paths.push(directoryPath);
    }
};
const empty = () => { };
function build(root, options) {
    const { includeDirs, filters, relativePaths } = options;
    if (!includeDirs)
        return empty;
    if (relativePaths)
        return filters && filters.length
            ? pushDirectoryFilterWithRelativePath(root)
            : pushDirectoryWithRelativePath(root);
    return filters && filters.length ? pushDirectoryFilter : pushDirectory;
}
export {pushDirectoryWithRelativePath,pushDirectoryFilterWithRelativePath,pushDirectory,pushDirectoryFilter,empty,build}