/**
 * 依赖许可证收集工具
 * 提供收集项目依赖许可证信息并按许可证类型分组的功能
 */

/**
 * 收集许可证信息
 * @returns {Promise<void>} 完成时resolved的Promise
 */
export async function 收集许可证信息() {
    // 动态导入依赖，避免在浏览器环境报错
    const { promises: fs } = await import('fs');
    
    try {
        // 尝试通过require.resolve查找license-checker-rseidelsohn
        const checker = require(require.resolve('license-checker-rseidelsohn', {
            paths: [process.env.NODE_PATH || '/usr/local/lib/node_modules']
        }));
        
        return new Promise((resolve, reject) => {
            checker.init({
                start: './',
                production: true,
                customFormat: {
                    name: true,
                    licenseText: true,
                    version: true,
                    licenses: true
                }
            }, async function(err, packages) {
                if (err) {
                    reject(err);
                    return;
                }

                // 按许可证类型分组
                const 许可证分组 = {};
                
                for (const [pkgName, info] of Object.entries(packages)) {
                    const licenseName = Array.isArray(info.licenses) 
                        ? info.licenses.join('/') 
                        : info.licenses;
                    
                    if (!许可证分组[licenseName]) {
                        许可证分组[licenseName] = {
                            packages: [],
                            licenseText: info.licenseText
                        };
                    }
                    
                    许可证分组[licenseName].packages.push({
                        name: pkgName,
                        version: info.version
                    });
                }

                // 生成输出
                let output = '# 项目依赖许可证汇总\n\n';
                
                for (const [licenseName, data] of Object.entries(许可证分组)) {
                    output += `## ${licenseName} 许可证\n\n`;
                    
                    output += '### 使用此许可证的包：\n\n';
                    data.packages.sort((a, b) => a.name.localeCompare(b.name));
                    data.packages.forEach(pkg => {
                        output += `- ${pkg.name} (${pkg.version})\n`;
                    });
                    output += '\n### 许可证文本：\n\n';
                    
                    if (data.licenseText) {
                        output += `${data.licenseText}\n\n`;
                    } else {
                        output += `未找到许可证文本。\n\n`;
                    }
                    output += '---\n\n';
                }

                try {
                    await fs.writeFile('LICENSES_GROUPED.md', output, 'utf-8');
                    console.log('许可证文件已生成：LICENSES_GROUPED.md');
                    
                    // 输出统计信息
                    console.log('\n许可证统计：');
                    for (const [licenseName, data] of Object.entries(许可证分组)) {
                        console.log(`${licenseName}: ${data.packages.length} 个包`);
                    }
                    
                    resolve(许可证分组);
                } catch (writeErr) {
                    reject(writeErr);
                }
            });
        });
    } catch (error) {
        console.error('加载license-checker失败:', error);
        throw new Error('无法加载license-checker模块，请确保已安装license-checker-rseidelsohn');
    }
}

/**
 * 获取许可证分组数据
 * @returns {Promise<Object>} 按许可证类型分组的数据
 */
export async function 获取许可证分组() {
    return await 收集许可证信息();
}

// 为保持兼容性，保留原始名称导出
export const collectLicenses = 收集许可证信息; 