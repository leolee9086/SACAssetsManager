/**
 * 测试套件模块
 * 实现HNSW索引的各种性能测试
 */

import { computeCosineDistance } from '../../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';
import { generateRandomVectors } from './generateVectors.mjs';
import { computePerformanceStats } from './statsUtils.mjs';
import { 
  computeCustomRecallRate, 
  computeClassicRecallRate, 
  computeHoraRecallRate,
  matchCustomToExact
} from './recallUtils.mjs';

// 导入自定义HNSW实现
import { createHNSWIndex } from '../../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';

import { 数据集 } from '../../../source/data/database/localDataBase/collection.js';

// 导入Hora WASM HNSW库
import * as horajs from '../../../static/horajs/index.js';

// 变量用于存储Hora模块
let hora;

/**
 * 初始化测试环境
 * @returns {Promise<boolean>} 初始化是否成功
 */
async function initTestEnvironment() {
  try {
    hora = await horajs.default();
    console.log('Hora初始化成功');
    return true;
  } catch (e) {
    console.error('Hora初始化失败:', e);
    return false;
  }
}

// 这里添加支持使用HNSWClassic模块的函数
function initClassicHNSWIndex(dimensions, params) {
  if (!global.HNSWClassic) {
    console.warn('HNSWClassic模块未加载，无法使用经典实现测试');
    return null;
  }
  
  const { HNSWIndex } = global.HNSWClassic;
  const index = new HNSWIndex(dimensions, {
    max_item: 10000,
    n_neighbor: params.M,
    n_neighbor0: params.M * 2,
    max_level: params.ml,
    ef_build: params.efConstruction,
    ef_search: params.efSearch
  });
  
  return index;
}

/**
 * 生成测试数据
 * @param {number} numVectors - 向量数量
 * @param {number} dimensions - 向量维度
 * @param {number} numQueries - 查询向量数量
 * @returns {Promise<{testData: Array, queryVectors: Array}>} - 测试数据和查询向量
 */
async function generateTestData(numVectors, dimensions, numQueries) {
  console.log(`生成${numVectors}个${dimensions}维随机向量...`);
  const testData = generateRandomVectors(numVectors, dimensions, true);
  const queryVectors = generateRandomVectors(numQueries, dimensions, true);

  return { testData, queryVectors };
}

/**
 * 运行单次测试
 * @param {number} numVectors - 向量数量
 * @param {number} dimensions - 向量维度
 * @param {number} numQueries - 查询次数
 * @param {number} k - 查询返回的邻居数量
 * @param {string} modelName - 模型名称
 * @param {Object} hnswParams - HNSW索引参数
 * @param {number} minRecallRate - 最小可接受召回率
 * @param {Object} options - 其他测试选项
 * @param {boolean} [options.skipClassicImplementation=false] - 是否跳过经典算法的测试
 * @param {boolean} [options.useClassicFromModule=false] - 是否使用HNSWClassic模块
 * @returns {Object} 测试结果
 */
async function runSingleTest(numVectors, dimensions, numQueries, k, modelName, hnswParams, minRecallRate, options = {}) {
  console.log(`\n============ 测试向量数量: ${numVectors} ============`);
  const skipClassicImplementation = options.skipClassicImplementation || false;
  const useClassicFromModule = options.useClassicFromModule || false;
  
  if (skipClassicImplementation) {
    console.log('⚠️ 注意: 经典HNSW实现将被跳过');
  } else if (useClassicFromModule) {
    console.log('👉 使用导入的HNSWClassic模块作为经典实现');
  }

  try {
    // 0. 准备测试数据
    console.log(`[1/4] 准备测试数据 (${numVectors}向量, ${dimensions}维度)...`);
    // 创建测试数据
    const { testData, queryVectors } = await generateTestData(numVectors, dimensions, numQueries);

    // 验证主键格式，仅对少量样本进行输出
    const sampleIds = testData.slice(0, 2).map(item => item.id);
    console.log(`样本ID: ${sampleIds.join(', ')}`);

    // 2. 初始化索引
    console.log(`[2/4] 初始化索引结构...`);

    // 自定义HNSW实现
    const customIndex = createHNSWIndex({
      distanceFunction: 'cosine',
      M: hnswParams.M,
      efConstruction: hnswParams.efConstruction,
      efSearch: hnswParams.efSearch,
      ml: hnswParams.ml
    });

    // 经典HNSW实现，仅在不跳过的情况下初始化
    let collection = null;
    let classicIndex = null;
    if (!skipClassicImplementation) {
      if (useClassicFromModule && global.HNSWClassic) {
        classicIndex = initClassicHNSWIndex(dimensions, hnswParams);
        if (!classicIndex) {
          console.warn('初始化经典HNSW索引失败，将跳过经典实现测试');
        }
      } else {
        const collectionName = `hnsw测试_${Date.now()}_${numVectors}`;
        collection = new 数据集(collectionName, 'id', 'debug', {
          文件保存格式: 'json',
          文件保存地址: './temp'
        });
      }
    }

    // 3. 测量索引构建时间
    console.log(`[3/4] 测量索引构建时间...`);

    // 记录构建时间
    const buildTimes = {
      custom: 0,
      classic: skipClassicImplementation ? -1 : 0,
      hora: 0
    };

    // 构建索引并计时
    console.log(`- 构建自定义HNSW索引...`);
    const customBuildStart = performance.now();

    // 添加数据到自定义HNSW索引
    try {
      for (const item of testData) {
        if (!item.vector.test_model) continue;

        if (typeof customIndex.addItem === 'function') {
          customIndex.addItem(item.vector.test_model, item.id, item.meta);
        } else if (typeof customIndex.insertNode === 'function') {
          customIndex.insertNode(item.vector.test_model, {
            id: item.id,
            ...item.meta
          });
        }
      }

      const customBuildEnd = performance.now();
      buildTimes.custom = customBuildEnd - customBuildStart;
      
      // 添加数据到经典实现
      if (!skipClassicImplementation) {
        console.log(`- 构建经典HNSW索引...`);
        const classicBuildStart = performance.now();
        
        if (useClassicFromModule && classicIndex) {
          // 使用HNSWClassic模块
          const { Node, Metric } = global.HNSWClassic;
          for (const item of testData) {
            if (!item.vector.test_model) continue;
            
            // 创建节点并添加到索引中
            const node = new Node(item.vector.test_model, item.id);
            classicIndex.addNode(node);
          }
          
          // 构建索引 - 使用余弦相似度测量方式
          classicIndex.build(Metric.Cosine);
        } else if (collection) {
          // 使用内部集合API
          for (const item of testData) {
            if (!item.meta) {
              item.meta = { id: item.id, text: `向量_${item.id}` };
            }
            await collection.添加数据([item]);
          }
        }
        
        const classicBuildEnd = performance.now();
        buildTimes.classic = classicBuildEnd - classicBuildStart;
      }

      // Hora WASM HNSW构建
      console.log(`- 构建Hora WASM HNSW索引...`);
      let horaIndex = null;
      let bulkAddResult = false;

      try {
        // 创建HNSW索引
        horaIndex = hora.HNSWIndexUsize.new(
          dimensions,
          numVectors + 100,
          hnswParams.M,
          hnswParams.M * 2,
          hnswParams.efConstruction,
          hnswParams.efSearch,
          false
        );

        if (!horaIndex) {
          throw new Error('创建Hora HNSW索引失败');
        }

        // 添加向量
        const horaBuildStart = performance.now();
        let successCount = 0;

        // 逐个添加向量
        for (let i = 0; i < testData.length; i++) {
          try {
            const item = testData[i];
            if (item.vector.test_model.length !== dimensions) continue;

            const vector = item.vector.test_model instanceof Float32Array ?
              item.vector.test_model : new Float32Array(Array.from(item.vector.test_model));

            const numericId = typeof item.id === 'string' ? parseInt(item.id.split('_')[1], 10) : item.id;
            horaIndex.add(vector, numericId);
            successCount++;
          } catch (addError) {
            // 忽略单个向量添加失败
          }
        }

        // 尝试构建索引
        try {
          const buildResult = horaIndex.build("angular");
          if (!buildResult) {
            // 尝试使用其他可能的距离度量值
            const metricsToTry = ["cosine", "euclidean", "dot", "manhattan"];
            for (const metric of metricsToTry) {
              try {
                const retryResult = horaIndex.build(metric);
                if (retryResult) break;
              } catch (e) {
                // 继续尝试下一个度量
              }
            }
          }
        } catch (buildError) {
          console.log('Hora索引构建初始尝试失败，正在尝试其他配置...');
        }

        const horaBuildEnd = performance.now();
        buildTimes.hora = horaBuildEnd - horaBuildStart;

        // 获取索引大小以确认构建成功
        const indexSize = horaIndex.size();
        bulkAddResult = indexSize > 0 && successCount > 0;

      } catch (error) {
        console.log('Hora WASM HNSW索引初始化失败');
        buildTimes.hora = 0;
        bulkAddResult = false;
      }

      // 4. 测量查询性能
      console.log(`[4/4] 测量查询性能和召回率...`);

      const customQueryTimes = [];
      const classicQueryTimes = [];
      const exactQueryTimes = [];
      const horaQueryTimes = [];
      const recallRates = { custom: [], classic: [], hora: [] };

      for (let i = 0; i < numQueries; i++) {
        const queryVector = queryVectors[i].vector.test_model;

        // 精确查询（暴力搜索）作为基准
        const exactStartTime = performance.now();
        const exactResults = testData
          .map(item => ({
            id: item.id,
            distance: computeCosineDistance(queryVector, item.vector.test_model),
            data: { id: item.id, text: item.meta.text }
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, k);
        const exactEndTime = performance.now();
        exactQueryTimes.push(exactEndTime - exactStartTime);
        if (i === 0) {
          console.log('- 精确查询结果样本:', JSON.stringify(exactResults.slice(0, 1)));
        }
        
        // 自定义HNSW查询
        const customStartTime = performance.now();
        let customResults = [];

        customResults = customIndex.searchKNN(queryVector, k, {
          includeMetadata: true
        });
        
        const customEndTime = performance.now();
        customQueryTimes.push(customEndTime - customStartTime);

        // 经典HNSW查询
        const classicStartTime = performance.now();
        let classicResults = null;
        
        if (!skipClassicImplementation) {
          if (useClassicFromModule && classicIndex) {
            // 使用HNSWClassic模块进行查询
            try {
              const { Node, Metric } = global.HNSWClassic;
              const queryNode = new Node(queryVector);
              const results = classicIndex.nodeSearchK(queryNode, k);
              classicResults = results.map(([node, distance]) => ({
                id: node.idx(),
                distance: distance,
                data: { id: node.idx() }
              }));
            } catch (error) {
              console.warn('经典HNSW查询出错:', error.message);
            }
          } else if (collection) {
            classicResults = await collection.以向量搜索数据('test_model', queryVector, k);
          }
        }
        
        const classicEndTime = performance.now();
        classicQueryTimes.push(classicEndTime - classicStartTime);

        // Hora WASM HNSW查询
        try {
          if (queryVector.length !== dimensions || !horaIndex) {
            horaQueryTimes.push(0);
            recallRates.hora.push(0);
            continue;
          }

          const horaQueryVector = queryVector instanceof Float32Array ?
            queryVector : new Float32Array(Array.from(queryVector));

          // 查询Hora索引
          const horaStartTime = performance.now();
          let horaResults = horaIndex.search(horaQueryVector, k);
          const horaEndTime = performance.now();
          horaQueryTimes.push(horaEndTime - horaStartTime);

          // 转换Hora结果为数组
          const horaResultArray = Array.from(horaResults);

          // 添加调试信息，查看Hora WASM实现的结果格式
          if (i === 0) {
            console.log('- Hora WASM结果样本:', JSON.stringify(horaResultArray.slice(0, 1)));
            console.log('======== 结果格式调试结束 ========\n');
          }

          // 计算各实现的召回率（仅在第一次查询时输出详细过程）
          const isFirstQuery = i === 0;

          // 为了排查问题，在第一次查询时输出更详细的调试信息
          if (isFirstQuery) {
            console.log('\n======== 召回率计算调试 ========');
            console.log(`精确结果数量: ${exactResults.length}`);
            console.log(`自定义HNSW结果数量: ${customResults.length}`);
            console.log(`经典HNSW结果数量: ${classicResults ? classicResults.length : '未计算'}`);
            console.log(`Hora WASM结果数量: ${horaResultArray.length}`);

            // 检查结果是否为空
            if (customResults.length === 0) {
              console.warn('警告: 自定义HNSW结果为空，这将导致召回率为0');
            }

            // 增强ID对比调试信息
            console.log('\n精确结果与近似结果ID对比分析:');

            // 提取前5个精确结果ID
            const topExactIds = exactResults.slice(0, 5).map(item => {
              const id = item.id || (item.data && item.data.id);
              return {
                id, numericId: typeof id === 'string' && id.includes('_') ?
                  Number(id.split('_')[1]) : Number(id)
              };
            });

            // 提取前5个自定义HNSW结果ID
            const topCustomIds = customResults.slice(0, 5).map(item => {
              const id = item.id || (item.data && item.data.id);
              return {
                id, numericId: typeof id === 'string' && id.includes('_') ?
                  Number(id.split('_')[1]) : Number(id)
              };
            });

            // 打印ID对比
            console.log('精确结果前5个ID:', JSON.stringify(topExactIds));
            console.log('自定义HNSW前5个ID:', JSON.stringify(topCustomIds));

            // ID匹配分析
            console.log('\n逐个ID匹配分析:');
            for (let j = 0; j < Math.min(5, topCustomIds.length); j++) {
              const approxId = topCustomIds[j].id;
              let foundMatch = false;

              for (let k = 0; k < topExactIds.length; k++) {
                const exactId = topExactIds[k].id;
                // 使用导入的matchCustomToExact函数进行ID匹配
                const isMatch = matchCustomToExact(approxId, exactId);

                if (isMatch) {
                  console.log(`✅ 自定义HNSW结果ID ${approxId} 匹配 精确结果ID ${exactId}`);
                  foundMatch = true;
                  break;
                }
              }

              if (!foundMatch) {
                console.log(`❌ 自定义HNSW结果ID ${approxId} 无匹配`);
                // 寻找最接近的ID
                const closestExactId = topExactIds.reduce((closest, exact) => {
                  if (typeof approxId === 'number' && typeof exact.numericId === 'number') {
                    const currentDiff = Math.abs(approxId - exact.numericId);
                    const closestDiff = closest ? Math.abs(approxId - closest.numericId) : Infinity;
                    return currentDiff < closestDiff ? exact : closest;
                  }
                  return closest;
                }, null);

                if (closestExactId) {
                  console.log(`  最接近的精确结果ID: ${closestExactId.id} (数字部分差异: ${typeof approxId === 'number' ?
                      Math.abs(approxId - closestExactId.numericId) :
                      '未知'
                    })`);
                }
              }
            }

            // 输出ID提取过程
            console.log('\n提取结果ID示例:');
            if (customResults.length > 0) {
              const sampleCustom = customResults[0];
              console.log('自定义HNSW第一个结果:',
                typeof sampleCustom === 'object' ? JSON.stringify(sampleCustom) : sampleCustom);
            }

            if (classicResults && classicResults.length > 0) {
              const sampleClassic = classicResults[0];
              console.log('经典HNSW第一个结果:',
                typeof sampleClassic === 'object' ? JSON.stringify(sampleClassic) : sampleClassic);
            }
          }

          const customRecall = computeCustomRecallRate(customResults, exactResults, k, isFirstQuery);
          const classicRecall = skipClassicImplementation ? null : computeClassicRecallRate(classicResults, exactResults, k, isFirstQuery);
          const horaRecall = computeHoraRecallRate(horaResultArray, exactResults, k, isFirstQuery);

          // 在第一次查询后输出召回率结果
          if (isFirstQuery) {
            console.log('\n召回率计算结果:');
            console.log(`自定义HNSW: ${(customRecall * 100).toFixed(2)}%`);
            console.log(`经典HNSW: ${(classicRecall ? (classicRecall * 100).toFixed(2) : '未计算')}%`);
            console.log(`Hora WASM: ${(horaRecall * 100).toFixed(2)}%`);
            console.log('======== 召回率计算调试结束 ========\n');
          }

          // 记录召回率
          recallRates.custom.push(customRecall);
          if (!skipClassicImplementation) {
            recallRates.classic.push(classicRecall);
          }
          recallRates.hora.push(horaRecall);
        } catch (error) {
          horaQueryTimes.push(0);
          recallRates.hora.push(0);
        }
      }

      // 5. 计算统计结果
      const customQueryStats = computePerformanceStats(customQueryTimes);
      const classicQueryStats = skipClassicImplementation ? null : computePerformanceStats(classicQueryTimes);
      const exactQueryStats = computePerformanceStats(exactQueryTimes);
      const horaQueryStats = computePerformanceStats(horaQueryTimes);

      const customRecallStats = computePerformanceStats(recallRates.custom.map(r => r * 100));
      const classicRecallStats = skipClassicImplementation ? null : computePerformanceStats(recallRates.classic.map(r => r * 100));
      const horaRecallStats = computePerformanceStats(recallRates.hora.map(r => r * 100));

      // 计算相对速度提升
      const speedups = {
        custom: exactQueryStats.avg / customQueryStats.avg,
        classic: skipClassicImplementation ? null : exactQueryStats.avg / classicQueryStats.avg,
        hora: horaQueryTimes.some(t => t > 0) ? exactQueryStats.avg / horaQueryStats.avg : 0
      };

      // 格式化输出测试结果，突出重要数据
      console.log('\n📊 测试结果摘要');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`向量数量: ${numVectors} | 维度: ${dimensions} | 查询次数: ${numQueries} | k值: ${k}`);

      // 构建时间表格
      console.log('\n⏱️  构建时间 (ms)');
      console.log('┌────────────────┬─────────────┐');
      console.log(`│ 自定义HNSW     │ ${buildTimes.custom.toFixed(2).padStart(11)} │`);
      console.log(`│ 经典HNSW       │ ${buildTimes.classic === -1 ? '跳过' : buildTimes.classic.toFixed(2).padStart(11)} │`);
      console.log(`│ Hora WASM HNSW │ ${buildTimes.hora.toFixed(2).padStart(11)} │`);
      console.log('└────────────────┴─────────────┘');

      // 查询时间和速度提升表格
      console.log('\n⚡ 查询时间 (ms) 和速度提升');
      console.log('┌────────────────┬─────────────┬─────────────┐');
      console.log(`│ 精确查询       │ ${exactQueryStats.avg.toFixed(2).padStart(11)} │      -      │`);
      console.log(`│ 自定义HNSW     │ ${customQueryStats.avg.toFixed(2).padStart(11)} │ ${speedups.custom.toFixed(2).padStart(11)}x │`);
      console.log(`│ 经典HNSW       │ ${classicQueryStats ? classicQueryStats.avg.toFixed(2).padStart(11) : '未计算'} │ ${speedups.classic === null ? 'N/A' : speedups.classic.toFixed(2).padStart(11)}x │`);
      console.log(`│ Hora WASM HNSW │ ${horaQueryStats.avg.toFixed(2).padStart(11)} │ ${(speedups.hora > 0 ? speedups.hora.toFixed(2) : 'N/A').padStart(11)} │`);
      console.log('└────────────────┴─────────────┴─────────────┘');

      // 召回率表格
      console.log('\n🎯 召回率 (%)');
      console.log('┌────────────────┬─────────────┬─────────────┬─────────────┐');
      console.log(`│ 实现           │     平均    │     最低    │     最高    │`);
      console.log('├────────────────┼─────────────┼─────────────┼─────────────┤');
      console.log(`│ 自定义HNSW     │ ${customRecallStats.avg.toFixed(2).padStart(11)} │ ${customRecallStats.min.toFixed(2).padStart(11)} │ ${customRecallStats.max.toFixed(2).padStart(11)} │`);
      console.log(`│ 经典HNSW       │ ${classicRecallStats ? classicRecallStats.avg.toFixed(2).padStart(11) : '未计算'} │ ${classicRecallStats ? classicRecallStats.min.toFixed(2).padStart(11) : '未计算'} │ ${classicRecallStats ? classicRecallStats.max.toFixed(2).padStart(11) : '未计算'} │`);
      console.log(`│ Hora WASM HNSW │ ${horaRecallStats.avg.toFixed(2).padStart(11)} │ ${horaRecallStats.min.toFixed(2).padStart(11)} │ ${horaRecallStats.max.toFixed(2).padStart(11)} │`);
      console.log('└────────────────┴─────────────┴─────────────┴─────────────┘');

      // 检查是否所有实现都满足最低召回率要求
      const recallPassed = {
        custom: customRecallStats.avg >= minRecallRate,
        classic: skipClassicImplementation ? null : classicRecallStats.avg >= minRecallRate,
        hora: horaRecallStats.avg >= minRecallRate
      };

      console.log(`\n📋 符合最低召回率要求 (${minRecallRate}%)`);
      console.log(`自定义HNSW: ${recallPassed.custom ? '✅ 通过' : '❌ 未通过'}`);
      console.log(`经典HNSW: ${recallPassed.classic === null ? '未计算' : (recallPassed.classic ? '✅ 通过' : '❌ 未通过')}`);
      console.log(`Hora WASM HNSW: ${recallPassed.hora ? '✅ 通过' : '❌ 未通过'}`);

      // 返回测试结果
      return {
        vectorCount: numVectors,
        buildTimes,
        queryStats: {
          exact: exactQueryStats,
          custom: customQueryStats,
          classic: classicQueryStats,
          hora: horaQueryStats
        },
        recallStats: {
          custom: customRecallStats,
          classic: classicRecallStats,
          hora: horaRecallStats
        },
        speedups,
        failedCriteria: {
          speedup: {
            custom: speedups.custom < 1,
            classic: skipClassicImplementation ? null : speedups.classic < 1,
            hora: speedups.hora > 0 ? speedups.hora < 1 : (bulkAddResult && horaRecallStats.avg <= 0)
          },
          recall: {
            custom: customRecallStats.avg < minRecallRate,
            classic: skipClassicImplementation ? null : classicRecallStats.avg < minRecallRate,
            hora: horaRecallStats.avg > 0 ? horaRecallStats.avg < minRecallRate : (bulkAddResult)
          }
        }
      };
    } catch (e) {
      console.error('索引构建过程发生错误:', e);
      throw e;
    }
  } catch (error) {
    console.error(`向量数量${numVectors}的测试执行失败:`, error);
    return {
      error: error.message || '未知错误',
      vectorCount: numVectors
    };
  }
}

/**
 * 指数级放大向量数量的测试
 * @param {Object} options - 测试配置选项
 * @param {number} [options.dimensions=1024] - 向量维度
 * @param {number} [options.numQueries=20] - 每次测试的查询次数
 * @param {number} [options.k=10] - 查询返回的邻居数量
 * @param {string} [options.modelName='test_model'] - 模型名称
 * @param {number} [options.minRecallRate=90] - 最小可接受召回率(%)
 * @param {number} [options.growthFactor=2] - 向量数量增长因子
 * @param {number} [options.maxVectorCount=1000] - 最大测试向量数量
 * @param {number} [options.startVectorCount=100] - 起始测试向量数量
 * @param {Object} [options.hnswParams] - HNSW索引参数
 * @param {boolean} [options.skipClassicImplementation=false] - 是否跳过经典算法的测试
 * @param {boolean} [options.useClassicFromModule=false] - 是否使用导入的经典模块
 * @returns {Promise<Object>} 测试结果
 */
async function 指数级扩展测试(options = {}) {
  console.log('\n===== HNSW索引实现指数级扩展测试 =====');

  try {
    await initTestEnvironment();

    // 测试参数
    const dimensions = options.dimensions || 1024;  // 向量维度
    const numQueries = options.numQueries || 20;    // 每次测试的查询次数
    const k = options.k || 10;                      // 查询返回的邻居数量
    const modelName = options.modelName || 'test_model'; // 模型名称
    const minRecallRate = options.minRecallRate || 90;   // 最小可接受召回率(%)
    const growthFactor = options.growthFactor || 2;      // 向量数量增长因子
    const maxVectorCount = options.maxVectorCount || 8000; // 最大测试向量数量
    const startVectorCount = options.startVectorCount || 1000; // 起始向量数量
    const skipClassicImplementation = options.skipClassicImplementation || false; // 是否跳过经典算法
    const useClassicFromModule = options.useClassicFromModule || false; // 是否使用导入的经典模块

    if (skipClassicImplementation) {
      console.log('📢 经典HNSW实现将被跳过（根据测试配置选项）');
    } else if (useClassicFromModule) {
      console.log('📢 将使用导入的HNSWClassic模块作为经典实现');
    }

    // HNSW参数
    const hnswParams = options.hnswParams || {
      M: 48,                 // 每个节点的最大连接数
      efConstruction: 800,   // 构建索引时的ef值
      efSearch: 800,         // 搜索时的ef值
      ml: 16                 // 最大层数
    };

    // 从小规模向量开始测试
    let currentVectorCount = startVectorCount;
    const testResults = [];
    let shouldStopTesting = false;

    while (currentVectorCount <= maxVectorCount && !shouldStopTesting) {
      try {
        // 运行当前规模的测试
        const result = await runSingleTest(
          currentVectorCount,
          dimensions,
          numQueries,
          k,
          modelName,
          hnswParams,
          minRecallRate,
          { skipClassicImplementation, useClassicFromModule }
        );

        testResults.push(result);

        // 检查是否有实现不满足性能要求
        const failedSpeedup = result.failedCriteria?.speedup;
        const failedRecall = result.failedCriteria?.recall;

        if (failedSpeedup && (failedSpeedup.custom && failedSpeedup.classic === null && failedSpeedup.hora)) {
          console.log('\n⚠️ 性能测试未通过: 自定义HNSW和Hora WASM HNSW的查询速度都慢于暴力搜索');
          console.log('- 自定义HNSW:', failedSpeedup.custom ? '未通过' : '通过');
          console.log('- 经典HNSW:', failedSpeedup.classic === null ? '未计算' : '通过');
          console.log('- Hora WASM HNSW:', failedSpeedup.hora ? '未通过' : '通过');
          shouldStopTesting = true;
        }

        if (failedRecall && (failedRecall.custom && failedRecall.classic === null && failedRecall.hora)) {
          console.log('\n⚠️ 准确性测试未通过: 自定义HNSW和Hora WASM HNSW的召回率都低于阈值', minRecallRate, '%');
          console.log('- 自定义HNSW:', failedRecall.custom ? '未通过' : '通过');
          console.log('- 经典HNSW:', failedRecall.classic === null ? '未计算' : '通过');
          console.log('- Hora WASM HNSW:', failedRecall.hora ? '未通过' : '通过');
          shouldStopTesting = true;
        }

        if (result.error) {
          console.log(`\n⚠️ 测试出现错误: ${result.error}`);
          shouldStopTesting = true;
          throw new Error(result.error);
        }

        if (!shouldStopTesting) {
          console.log(`\n✅ 向量数量 ${currentVectorCount} 的测试通过，继续下一规模测试`);
          // 增加向量数量
          currentVectorCount *= growthFactor;
        }
      } catch (error) {
        console.error(`向量数量 ${currentVectorCount} 的测试出现错误, 测试终止:`, error);
        // 记录错误并终止测试
        testResults.push({
          vectorCount: currentVectorCount,
          error: error.message || '未知错误',
          failedCriteria: { error: true }
        });

        // 设置终止标志，不再继续下一个规模的测试
        shouldStopTesting = true;
      }
    }

    // 输出最终测试结果摘要
    console.log('\n===== 指数级扩展测试结果摘要 =====');
    if (testResults.length > 0) {
      console.log(`完成测试的最大向量数量: ${testResults[testResults.length - 1].vectorCount}`);

      // 输出性能趋势图表数据
      console.log('\n性能趋势数据:');
      console.log('向量数量,自定义HNSW查询时间(ms),经典HNSW查询时间(ms),Hora WASM查询时间(ms),精确查询时间(ms),自定义HNSW召回率(%),经典HNSW召回率(%),Hora WASM召回率(%)');

      testResults.forEach(result => {
        if (!result.error) {
          console.log(`${result.vectorCount},${result.queryStats.custom.avg.toFixed(2)},${result.queryStats.classic ? result.queryStats.classic.avg.toFixed(2) : '未计算'},${result.queryStats.hora.avg.toFixed(2)},${result.queryStats.exact.avg.toFixed(2)},${result.recallStats.custom.avg.toFixed(2)},${result.recallStats.classic ? result.recallStats.classic.avg.toFixed(2) : '未计算'},${result.recallStats.hora.avg.toFixed(2)}`);
        }
      });

      // 分析结果
      // 找出每种实现的最大有效向量数量
      const lastValidResult = testResults[testResults.length - 1];

      console.log('\n总体评估:');
      if (lastValidResult.vectorCount >= maxVectorCount) {
        console.log(`所有实现在测试的最大向量数量 ${maxVectorCount} 下都满足性能要求`);
      } else if (shouldStopTesting) {
        console.log(`在向量数量 ${lastValidResult.vectorCount} 时，有实现不满足性能要求，测试终止`);
      }

      // 各实现的最终性能对比
      if (!lastValidResult.error) {
        console.log('\n最终规模下各实现性能对比:');

        const implementations = ['自定义HNSW', '经典HNSW', 'Hora WASM HNSW'];
        const speedups = [lastValidResult.speedups.custom, lastValidResult.speedups.classic === null ? null : lastValidResult.speedups.classic, lastValidResult.speedups.hora];
        const recalls = [lastValidResult.recallStats.custom.avg, lastValidResult.recallStats.classic ? lastValidResult.recallStats.classic.avg : null, lastValidResult.recallStats.hora.avg];

        // 跳过Hora评估，如果它没有成功运行
        let validImplementations = implementations.slice();
        let validSpeedups = speedups.slice();
        let validRecalls = recalls.slice();

        if (speedups[2] <= 0) {
          // 移除Hora相关数据
          validImplementations.pop();
          validSpeedups.pop();
          validRecalls.pop();
        }

        // 找出最佳速度和召回率的实现
        const bestSpeedupIndex = validSpeedups.findIndex(s => s === Math.max(...validSpeedups.filter(s => s !== null)));
        const bestRecallIndex = validRecalls.findIndex(r => r === Math.max(...validRecalls.filter(r => r !== null)));

        console.log(`速度最优: ${validImplementations[bestSpeedupIndex]} (${validSpeedups[bestSpeedupIndex] === null ? 'N/A' : validSpeedups[bestSpeedupIndex].toFixed(2)}x)`);
        console.log(`召回率最优: ${validImplementations[bestRecallIndex]} (${validRecalls[bestRecallIndex] === null ? '未计算' : validRecalls[bestRecallIndex].toFixed(2)}%)`);

        // 综合评分
        const combinedScores = validImplementations.map((_, i) => {
          // 标准化速度分数
          const speedupScore = validSpeedups[i] === null ? 0 : validSpeedups[i] / Math.max(...validSpeedups.filter(s => s !== null));
          // 标准化召回率分数
          const recallScore = validRecalls[i] === null ? 0 : validRecalls[i] / Math.max(...validRecalls.filter(r => r !== null));
          // 综合分数 (60% 速度 + 40% 召回率)
          return speedupScore * 0.6 + recallScore * 0.4;
        });

        const bestOverallIndex = combinedScores.findIndex(score => score === Math.max(...combinedScores));
        console.log(`综合性能最优: ${validImplementations[bestOverallIndex]}`);
      }
    } else {
      console.log('没有成功完成任何测试');
    }

    return {
      error: null,
      testResults
    };
  } catch (error) {
    console.error('指数级扩展测试执行失败:', error);
    // 不再抛出错误，允许程序继续执行
    return {
      error: error.message || '未知错误',
      testResults: [] // 返回空结果集
    };
  }
}

/**
 * 运行指数级扩展测试的包装函数，处理所有异常
 * @param {Object} options - 测试配置选项
 * @returns {Promise<Object>} 测试结果
 */
async function 安全运行指数级扩展测试(options = {}) {
  try {
    console.log('开始HNSW索引性能对比测试...');
    const results = await 指数级扩展测试(options);
    console.log('HNSW索引性能对比测试完成');
    return results;
  } catch (error) {
    console.error('测试过程中出现未预期的错误，但不会中断执行:', error);
    return { error: error.message || '未知错误' };
  }
}

export { runSingleTest, 指数级扩展测试, 安全运行指数级扩展测试, initTestEnvironment }; 