export function cleanAssetPath(assetPath) {
    return assetPath && assetPath.split('/').pop().replace(/-\d{14}-[a-z0-9]{7}/, '');
}