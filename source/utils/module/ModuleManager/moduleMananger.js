import * as esbuild from 'esbuild';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { get } from 'https';

/**
 * 创建模块解析器
 */
export function createModuleResolver(options = {}) {
    const config = {
        cdnPrefix: options.cdnPrefix || 'https://cdn.jsdelivr.net/npm',
        registry: options.registry || 'https://registry.npmjs.org',
        cacheDir: options.cacheDir || './cache',
        timeout: options.timeout || 30000,
        target: options.target || 'es2020',
        conditions: options.conditions || ['default', 'module', 'import']
    };

    const buildCache = new Map();

    return {
        resolveModule: (name, version, options = {}) => 
            resolveModule(name, version, { buildCache, config, options }),
        analyzeDependencies: (entryFile) => 
            analyzeDependencies(entryFile, config),
        clearCache: () => buildCache.clear()
    };
}

/**
 * 解析模块
 */
async function resolveModule(name, version, { buildCache, config, options }) {
    try {
        const cacheKey = generateCacheKey(name, version, options);
        
        if (buildCache.has(cacheKey)) {
            return buildCache.get(cacheKey);
        }

        const pkgInfo = await fetchPackageInfo(name, version, config);
        const resolvedVersion = pkgInfo.version;
        
        // 解析导出配置
        const entryPoint = await resolveExports(pkgInfo, options.subpath, config.conditions);
        
        // 分析依赖
        const deps = await analyzeDependencies(`${name}@${resolvedVersion}/${entryPoint}`, config);
        
        // 生成导入映射
        const importMap = generateImportMap(deps, config, options);
        
        // 构建模块
        const result = await buildModule(name, resolvedVersion, entryPoint, deps, config, options);

        const moduleInfo = {
            code: result.outputFiles[0].text,
            importMap,
            dependencies: deps,
            version: resolvedVersion
        };

        buildCache.set(cacheKey, moduleInfo);
        return moduleInfo;
    } catch (err) {
        throw handleModuleError(err);
    }
}

/**
 * 生成缓存键
 */
function generateCacheKey(name, version, options) {
    const key = {
        name,
        version,
        subpath: options.subpath || '',
        dev: options.dev || false,
        target: options.target,
        conditions: options.conditions
    };
    return createHash('sha1').update(JSON.stringify(key)).digest('hex');
}

/**
 * 解析导出配置
 */
async function resolveExports(pkg, subpath = '', conditions) {
    const exports = pkg.exports;
    if (!exports) {
        return pkg.main || 'index.js';
    }

    if (subpath) {
        const subExports = exports['./' + subpath];
        if (!subExports) {
            throw new ModuleError(
                ModuleError.EXPORTS_INVALID,
                `No exports found for subpath: ${subpath}`
            );
        }
        return resolveExportConditions(subExports, conditions);
    }

    return resolveExportConditions(
        typeof exports === 'string' ? exports : exports['.'],
        conditions
    );
}

/**
 * 解析导出条件
 */
function resolveExportConditions(exports, conditions) {
    if (typeof exports === 'string') {
        return exports;
    }

    for (const condition of conditions) {
        if (exports[condition]) {
            return exports[condition];
        }
    }

    return exports.default;
}

/**
 * 构建模块
 */
async function buildModule(name, version, entryPoint, deps, config, options) {
    const buildOptions = {
        entryPoints: [`${name}@${version}/${entryPoint}`],
        bundle: true,
        write: false,
        format: 'esm',
        target: options.target || config.target,
        platform: 'neutral',
        external: Object.keys(deps),
        define: {
            'process.env.NODE_ENV': JSON.stringify(options.dev ? 'development' : 'production')
        },
        minify: !options.dev,
        sourcemap: options.dev,
        keepNames: options.keepNames || false
    };

    if (options.exports?.length) {
        buildOptions.exports = options.exports;
    }

    return esbuild.build(buildOptions);
}

/**
 * 生成导入映射
 */
function generateImportMap(deps, config, options) {
    const externalDeps = new Set(options.external || []);
    const imports = {};

    for (const [name, info] of deps.entries()) {
        if (externalDeps.has(name)) {
            imports[name] = name;
        } else {
            imports[name] = `${config.cdnPrefix}/${name}@${info.version}`;
        }
    }

    return { imports };
}

/**
 * 错误处理
 */
class ModuleError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'ModuleError';
        this.code = code;
        this.details = details;
    }

    static VERSION_INVALID = 'VERSION_INVALID';
    static MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';
    static BUILD_FAILED = 'BUILD_FAILED';
    static EXPORTS_INVALID = 'EXPORTS_INVALID';
}

function handleModuleError(err) {
    if (err instanceof ModuleError) {
        return err;
    }

    if (err.code === 'ENOENT') {
        return new ModuleError(
            ModuleError.MODULE_NOT_FOUND,
            'Module not found',
            { originalError: err }
        );
    }

    if (err.message.includes('Could not resolve')) {
        return new ModuleError(
            ModuleError.MODULE_NOT_FOUND,
            err.message,
            { originalError: err }
        );
    }

    return new ModuleError(
        'UNKNOWN',
        err.message,
        { originalError: err }
    );
}

/**
 * 分析依赖
 */
async function analyzeDependencies(entryPoint, config) {
    const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        metafile: true,
        platform: 'neutral',
        external: ['electron'],
        format: 'esm'
    });

    return processDependencies(result.metafile);
}

/**
 * 处理依赖信息
 */
function processDependencies(metafile) {
    return Object.entries(metafile.inputs)
        .filter(([path]) => path.includes('node_modules'))
        .reduce((deps, [path]) => {
            const matches = path.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
            if (matches) {
                const pkgName = matches[1];
                if (!deps.has(pkgName)) {
                    deps.set(pkgName, {
                        name: pkgName,
                        version: 'latest',
                        importedBy: []
                    });
                }
                deps.get(pkgName).importedBy.push(path);
            }
            return deps;
        }, new Map());
}

/**
 * 获取包信息
 */
async function fetchPackageInfo(name, version, config) {
    const url = `${config.registry}/${name}`;
    return new Promise((resolve, reject) => {
        get(url, {
            timeout: config.timeout,
            headers: { 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    info.version = resolveVersion(info, version);
                    resolve(info);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

/**
 * 解析版本
 */
function resolveVersion(pkgInfo, versionSpec) {
    if (versionSpec === 'latest') {
        return pkgInfo['dist-tags'].latest;
    }
    
    const versions = Object.keys(pkgInfo.versions)
        .filter(v => satisfiesVersion(v, versionSpec))
        .sort(compareVersions);
    
    return versions[versions.length - 1] || pkgInfo['dist-tags'].latest;
}

/**
 * 版本比较
 */
function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (partsA[i] !== partsB[i]) {
            return partsA[i] - partsB[i];
        }
    }
    return 0;
}

/**
 * 检查版本是否满足规范
 */
function satisfiesVersion(version, spec) {
    if (spec === '*' || spec === 'latest') return true;
    
    const [specVersion, specRange] = parseVersionSpec(spec);
    const current = version.split('.').map(Number);
    const target = specVersion.split('.').map(Number);
    
    switch (specRange) {
        case '^':
            return current[0] === target[0] && 
                   (current[1] > target[1] || 
                    (current[1] === target[1] && current[2] >= target[2]));
        case '~':
            return current[0] === target[0] && 
                   current[1] === target[1] && 
                   current[2] >= target[2];
        default:
            return version === spec;
    }
}

/**
 * 解析版本规范
 */
function parseVersionSpec(spec) {
    const match = spec.match(/^([~^])?(.+)/);
    return [match[2], match[1] || '='];
}
