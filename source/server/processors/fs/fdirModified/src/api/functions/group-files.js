const groupFiles = (groups, directory, files) => {
    groups.push({ directory, files, dir: directory });
};
const empty = () => { };
function build(options) {
    return options.group ? groupFiles : empty;
}
export {groupFiles,empty,build}