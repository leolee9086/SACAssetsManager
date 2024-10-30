const checker = require(require.resolve('license-checker-rseidelsohn', {
    paths: [process.env.NODE_PATH || '/usr/local/lib/node_modules']
}));
const fs = require('fs').promises;

async function collectLicenses() {
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
            const licenseGroups = {};
            
            for (const [pkgName, info] of Object.entries(packages)) {
                const licenseName = Array.isArray(info.licenses) 
                    ? info.licenses.join('/') 
                    : info.licenses;
                
                if (!licenseGroups[licenseName]) {
                    licenseGroups[licenseName] = {
                        packages: [],
                        licenseText: info.licenseText
                    };
                }
                
                licenseGroups[licenseName].packages.push({
                    name: pkgName,
                    version: info.version
                });
            }

            // 生成输出
            let output = '# 项目依赖许可证汇总\n\n';
            
            for (const [licenseName, data] of Object.entries(licenseGroups)) {
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
                for (const [licenseName, data] of Object.entries(licenseGroups)) {
                    console.log(`${licenseName}: ${data.packages.length} 个包`);
                }
                
                resolve();
            } catch (writeErr) {
                reject(writeErr);
            }
        });
    });
}