<think>好，我现在需要为这个JavaScript文件中的两个函数生成单元测试。用户的要求是不使用任何外部测试库，比如Jest或者Mocha，而是自己实现测试逻辑。测试代码需要导出一个名为run的异步函数，这个函数接收module和emitter两个参数。emitter用来发送测试事件，比如开始、结束、每个测试用例的状态等。

首先，我需要分析这两个函数的功能和可能的测试用例。第一个函数是sliceDelete，它从数组中删除指定范围的元素，返回新数组，并且有类型检查和错误抛出。第二个函数是sliceDeleteAsync，是它的异步版本，还带有分块处理的选项。

对于sliceDelete，测试点应该包括：
1. 正常情况下的删除操作，比如删除中间部分、开头部分、结尾部分。
2. 参数类型错误的检查，比如第一个参数不是数组，或者start和end不是数字。
3. 索引范围错误的检查，比如start大于数组长度，或者end超过数组长度，或者start大于end。
4. 处理负数索引的情况。
5. 空数组或者无需删除的情况直接返回原数组的拷贝。

对于sliceDeleteAsync，除了上述测试点外，还需要测试异步处理是否正确，特别是分块处理的逻辑是否正确，以及是否保持了原数组不变，同时还要检查异步函数是否正确返回Promise。

接下来，需要考虑如何组织测试用例。每个测试用例应该是一个async函数，在run函数中被调用。每个用例都需要通过emitter发送case事件，然后执行断言，根据结果发送pass或者fail事件。

断言部分需要自己实现，比如判断返回的数组是否正确，是否抛出了预期的错误。对于异步函数，需要await执行，并捕获可能的错误。

需要注意的是，原数组是否被修改，sliceDelete应该是不修改原数组的，所以需要检查原数组是否保持不变。

另外，测试用例的顺序可能需要先测试同步函数，再测试异步函数。或者按照功能模块来分组。

现在开始编写测试代码的结构：

在run函数中，首先emitter.emit('start')，然后依次调用各个测试用例函数。每个测试用例函数内部使用try-catch来捕获错误，如果断言失败则通过emitter发送fail事件。

例如，测试正常删除的情况：
- 创建一个数组，调用sliceDelete，检查结果是否符合预期，原数组是否不变。
- 测试不同的start和end组合，比如删除开头、中间、结尾，以及删除整个数组的情况。

错误类型的测试：
- 传入非数组参数，应该抛出TypeError。
- start或end不是数字时，同样抛出TypeError。
- start或end超出范围时，抛出RangeError。
- 处理负数索引是否正确，比如start为-2，转换为正确的正索引。

异步函数的测试：
- 基本功能和同步版本一致，但需要用await调用。
- 测试分块处理是否有效，比如设置较小的chunkSize，验证处理是否正确。
- 同时需要测试异步函数在错误情况下的表现。

编写断言函数，比如assertEqual检查两个值是否相等，assertThrows检查是否抛出特定错误。

比如，assertEqual函数可以接受actual、expected和message，如果不相等，则抛出错误。在测试用例中，用try块包裹，如果断言失败则catch到错误，发送fail事件。

另外，对于异步函数sliceDeleteAsync的错误测试，可能需要使用try-catch包裹，并在catch中检查错误类型。

现在具体考虑每个测试用例的结构：

例如，测试正常删除：

function testNormalDeletion(module, emitter) {
  emitter.emit('case', '正常删除中间元素');
  const arr = [1,2,3,4,5];
  const result = module.sliceDelete(arr, 1, 3);
  assertEqual(result, [1,4,5], '结果不正确');
  assertEqual(arr, [1,2,3,4,5], '原数组被修改');
}

但需要将这些测试用例转换成在run函数中调用的形式，并处理异步情况。

然后，在run函数中，按照顺序执行这些测试用例，每个用例作为async函数。

例如：

async function run(module, emitter) {
  emitter.emit('start', '开始测试...');
  let passCount = 0;
  let failCount = 0;

  const tests = [
    testNormalDeletionSync,
    testNegativeIndicesSync,
    // 其他测试用例...
    testNormalDeletionAsync,
    testAsyncChunkProcessing,
  ];

  for (const test of tests) {
    try {
      emitter.emit('case', test.description); // 需要每个测试用例有描述
      await test(module, emitter);
      passCount++;
      emitter.emit('pass', '测试通过');
    } catch (e) {
      failCount++;
      emitter.emit('fail', e.message);
    }
  }

  emitter.emit('end', { pass: passCount, fail: failCount });
}

不过这里可能需要每个测试函数自己处理emitter的case事件，或者在调用时传入。或者在每个测试用例开始时手动触发case事件。

或者，在run函数中遍历所有测试函数，并在每个函数执行前触发case事件。

比如：

async function run(module, emitter) {
  emitter.emit('start', '开始测试...');
  let pass = 0;
  let fail = 0;

  const testCases = [
    { name: '正常删除中间元素', fn: testNormalDeletion },
    { name: '处理负数索引', fn: testNegativeIndices },
    // 其他测试...
  ];

  for (const {name, fn} of testCases) {
    emitter.emit('case', name);
    try {
      await fn(module);
      pass++;
      emitter.emit('pass', `${name} 通过`);
    } catch (e) {
      fail++;
      emitter.emit('fail', `${name} 失败: ${e.message}`);
    }
  }

  emitter.emit('end', `通过: ${pass}, 失败: ${fail}`);
}

这样结构更清晰，每个测试用例的名字和对应的函数分开管理。

接下来，实现具体的测试函数。比如：

async function testNormalDeletion(module) {
  const arr = [1,2,3,4,5];
  const result = module.sliceDelete(arr, 1, 3);
  assertEqual(result, [1,4,5], '结果数组不正确');
  assertEqual(arr, [1,2,3,4,5], '原数组被修改');
}

这里的assertEqual需要自己实现：

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `预期 ${expected}，实际得到 ${actual}`);
  }
}

不过，对于对象或数组的比较，JSON.stringify可能不够严谨，比如元素的顺序或对象的属性顺序不同可能会导致错误。但在这个测试中，数组的顺序很重要，所以可以接受这种方法。

另外，测试错误抛出的情况，比如参数类型错误：

async function testTypeError(module) {
  try {
    module.sliceDelete('not an array', 0, 1);
    throw new Error('未抛出预期错误');
  } catch (e) {
    if (!(e instanceof TypeError)) {
      throw new Error('预期TypeError，实际得到 ' + e.constructor.name);
    }
  }
}

类似地，测试其他错误类型，比如RangeError。

对于异步函数sliceDeleteAsync的测试，需要注意使用await，并且处理错误：

async function testAsyncDeletion(module) {
  const arr = [1,2,3,4,5];
  const result = await module.sliceDeleteAsync(arr, 1, 3);
  assertEqual(result, [1,4,5]);
  assertEqual(arr, [1,2,3,4,5]);
}

测试分块处理的情况，可以设置一个较小的chunkSize，比如当数组很大时，比如10000个元素，删除中间部分，并验证结果的长度是否正确。

另外，需要测试异步函数的错误处理，比如传入错误的参数是否抛出错误。

但需要注意，异步函数的错误需要通过catch来捕获，例如：

async function testAsyncTypeError(module) {
  try {
    await module.sliceDeleteAsync('not array', 0, 1);
    throw new Error('未抛出预期错误');
  } catch (e) {
    if (!(e instanceof TypeError)) {
      throw new Error('预期TypeError，实际得到 ' + e.constructor.name);
    }
  }
}

现在，将所有测试用例组织起来，编写各个测试函数，并在run函数中循环执行。

同时，统计pass和fail的数量，并在最后发送end事件。

在事件发射方面，每个测试用例开始前发送case事件，成功发送pass，失败发送fail。

此外，还需要处理异步测试函数的执行顺序，确保每个测试用例都按顺序执行，并通过await等待完成。

最后，编写完整的测试代码，确保符合用户的要求，不引入外部库，导出run函数，正确处理所有事件。
</think>


async function run(module, emitter) {
    emitter.emit('start', '开始测试...');
    let passCount = 0;
    let failCount = 0;

    const assert = {
        equal(actual, expected, message) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`${message || '断言失败'}\n预期: ${expected}\n实际: ${actual}`);
            }
        },
        throws(fn, ErrorType, message) {
            try {
                fn();
                throw new Error('未抛出预期错误');
            } catch (e) {
                if (!(e instanceof ErrorType)) {
                    throw new Error(`${message || '错误类型不匹配'}\n预期: ${ErrorType.name}\n实际: ${e.constructor.name}`);
                }
            }
        }
    };

    const testCases = [
        // 同步函数测试
        { 
            desc: '正常删除中间元素',
            async run() {
                const arr = [1,2,3,4,5];
                const result = module.sliceDelete(arr, 1, 3);
                assert.equal(result, [1,4,5], '结果数组不正确');
                assert.equal(arr, [1,2,3,4,5], '原数组被修改');
            }
        },
        {
            desc: '处理负数索引',
            async run() {
                const arr = [1,2,3,4,5];
                const result = module.sliceDelete(arr, -4, -2);
                assert.equal(result, [1,4,5]);
            }
        },
        {
            desc: '参数类型检查',
            async run() {
                assert.throws(() => module.sliceDelete('not array', 0, 1), TypeError);
                assert.throws(() => module.sliceDelete([], '0', 1), TypeError);
            }
        },
        {
            desc: '边界检查',
            async run() {
                assert.throws(() => module.sliceDelete([1], 2, 3), RangeError);
                assert.throws(() => module.sliceDelete([1], 1, 0), RangeError);
            }
        },

        // 异步函数测试
        {
            desc: '异步正常删除',
            async run() {
                const arr = [1,2,3,4,5];
                const result = await module.sliceDeleteAsync(arr, 1, 3);
                assert.equal(result, [1,4,5]);
            }
        },
        {
            desc: '异步分块处理',
            async run() {
                const arr = Array.from({length: 10000}, (_, i) => i);
                const result = await module.sliceDeleteAsync(arr, 1000, 3000, {chunkSize: 500});
                assert.equal(result.length, 8000);
                assert.equal(result[999], 999);
                assert.equal(result[1000], 3000);
            }
        },
        {
            desc: '异步参数检查',
            async run() {
                await assert.throws(async () => {
                    await module.sliceDeleteAsync('not array', 0, 1)
                }, TypeError);
            }
        }
    ];

    for (const test of testCases) {
        try {
            emitter.emit('case', test.desc);
            await test.run();
            passCount++;
            emitter.emit('pass', `${test.desc} 通过`);
        } catch (e) {
            failCount++;
            emitter.emit('fail', `${test.desc} 失败: ${e.message}`);
        }
    }

    emitter.emit('end', `测试完成，通过: ${passCount}, 失败: ${failCount}`);
}

export { run };