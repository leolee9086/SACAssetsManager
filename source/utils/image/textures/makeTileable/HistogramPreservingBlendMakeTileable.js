import { emptyImageInput, imageDataToImageInput, imageInputToImageData } from "./utils/imageInputTransform.js";
import { makeHistoGaussianEigen, unmakeHistoGaussianEigen } from "./GaussianEigen.js"
/***
 * 用于将贴图进行无缝化
 * 原始算法来自https://unity-grenoble.github.io/website/demo/2020/10/16/demo-histogram-preserving-blend-make-tileable.html
 * 有一定修改以便于加快运行速度
 */
/****************** ALGORITHM *****************/
/**********************************************/
/**********************************************/
/**********************************************/
/**********************************************/
var rngState = 0;

function wangHash(seed) {
    seed = (seed ^ 61) ^ (seed >> 16);
    seed *= 9;
    seed = seed ^ (seed >> 4);
    seed *= 0x27d4eb2d;
    seed = seed ^ (seed >> 15);
    return seed;
}
function randXorshift() {
    // Xorshift algorithm from George Marsaglia's paper
    rngState ^= (rngState << 13);
    rngState ^= (rngState >> 17);
    rngState ^= (rngState << 5);
    rngState = customModulo(rngState, 4294967296)
}

function randXorshiftFloat() {
    randXorshift();
    var res = rngState * (1.0 / 4294967296.0);
    return res;
}
function setSeed(i) {
    rngState = wangHash(i);
}
function remapValue(value, low1, high1, low2, high2) {
    return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}
function customModulo(x, n) {
    var r = x % n;
    if (r < 0) {
        r += n;
    }
    return r;
}
function getBorderSize(num, imageInput) {
    const pos = num / 100
    return Math.max(Math.floor(pos * Math.min(imageInput.width, imageInput.height) / 2.0), 2)
}
function calculateTileParameters(targetWidth, targetHeight, borderSize) {
    var tileCountWidth = Math.floor(targetWidth / borderSize);
    var tileRadiusWidth = borderSize;
    var restWidth = targetWidth - tileRadiusWidth * tileCountWidth;
    tileRadiusWidth += Math.floor(restWidth / tileCountWidth);
    restWidth = targetWidth - tileRadiusWidth * tileCountWidth;

    var tileCountHeight = Math.floor(targetHeight / borderSize);
    var tileRadiusHeight = borderSize;
    var restHeight = targetHeight - tileRadiusHeight * tileCountHeight;
    tileRadiusHeight += Math.floor(restHeight / tileCountHeight);
    restHeight = targetHeight - tileRadiusHeight * tileCountHeight;

    var tileWidth = tileRadiusWidth * 2;
    var tileHeight = tileRadiusHeight * 2;

    return {
        tileCountWidth: tileCountWidth,
        tileRadiusWidth: tileRadiusWidth,
        restWidth: restWidth,
        tileCountHeight: tileCountHeight,
        tileRadiusHeight: tileRadiusHeight,
        restHeight: restHeight,
        tileWidth: tileWidth,
        tileHeight: tileHeight
    };
}
function applyBorderBlending(output, imageInputGaussian, targetWidth, targetHeight, borderSize) {
    for (var y = 0; y < targetHeight; ++y) {
        for (var x = 0; x < targetWidth; ++x) {
            var w = Math.min(remapValue(x, 0, borderSize, 0.0, 1.0), 1.0); // Left border
            w *= Math.min(remapValue(x, targetWidth - 1, targetWidth - 1 - borderSize, 0.0, 1.0), 1.0); // Right border
            w *= Math.min(remapValue(y, 0, borderSize, 0.0, 1.0), 1.0); // Top border
            w *= Math.min(remapValue(y, targetHeight - 1, targetHeight - 1 - borderSize, 0.0, 1.0), 1.0); // Bottom border
            var w_inv = 1.0 - w;
            w = w / Math.sqrt(w * w + w_inv * w_inv);
            output.dataR[y][x] = w * imageInputGaussian.dataR[y][x];
            output.dataG[y][x] = w * imageInputGaussian.dataG[y][x];
            output.dataB[y][x] = w * imageInputGaussian.dataB[y][x];
        }
    }
}

function calculateTileCenterAndOffset(i_tile, j_tile, tileCountWidth, tileCountHeight, restWidth, restHeight) {
    let tileCenterWidth = 0, tileCenterHeight = 0;
    let cumulativeOffsetWidth = 0, cumulativeOffsetHeight = 0;

    if (i_tile > tileCountWidth - 2 - restWidth) {
        tileCenterWidth = 1;
        cumulativeOffsetWidth = (i_tile - 1) - (tileCountWidth - 2 - restWidth);
    } else if (j_tile > tileCountHeight - 2 - restHeight) {
        tileCenterHeight = 1;
        cumulativeOffsetHeight = (j_tile - 1) - (tileCountHeight - 2 - restHeight);
    }

    return { tileCenterWidth, tileCenterHeight, cumulativeOffsetWidth, cumulativeOffsetHeight };
}
function calculateWeight(i, j, tileWidth, tileHeight, tileCenterWidth, tileCenterHeight) {
    let w = 0;
    if (i >= tileWidth / 2 && i < tileWidth / 2 + tileCenterWidth) {
        let w0 = 1.0 - Math.floor(Math.abs(j - 0.5 * (tileHeight - 1))) / (tileHeight / 2 - 1);
        let w1 = 1.0 - w0;
        w = w0 / Math.sqrt(w0 * w0 + w1 * w1);
    } else if (j >= tileHeight / 2 && j < tileHeight / 2 + tileCenterHeight) {
        let w0 = 1.0 - Math.floor(Math.abs(i - 0.5 * (tileWidth - 1))) / (tileWidth / 2 - 1);
        let w1 = 1.0 - w0;
        w = w0 / Math.sqrt(w0 * w0 + w1 * w1);
    } else {
        let temp_j = j >= tileHeight / 2 + tileCenterHeight ? j - tileCenterHeight : j;
        let temp_i = i >= tileWidth / 2 + tileCenterWidth ? i - tileCenterWidth : i;

        let lambda_x = 1.0 - Math.floor(Math.abs(temp_i - 0.5 * (tileWidth - 1))) / (tileWidth / 2 - 1);
        let lambda_y = 1.0 - Math.floor(Math.abs(temp_j - 0.5 * (tileHeight - 1))) / (tileHeight / 2 - 1);
        let w00 = (1.0 - lambda_x) * (1.0 - lambda_y);
        let w10 = lambda_x * (1.0 - lambda_y);
        let w01 = (1.0 - lambda_x) * lambda_y;
        let w11 = lambda_x * lambda_y;
        w = lambda_x * lambda_y / Math.sqrt(w00 * w00 + w10 * w10 + w01 * w01 + w11 * w11);
    }
    return w;
}
function applyTileBlending(output, imageInputGaussian, tileParameters, targetWidth, targetHeight) {
    let { tileCountWidth, tileCountHeight, tileWidth, tileHeight, restWidth, restHeight } = tileParameters;
    for (let c = -1; c < (tileCountWidth - 1) + (tileCountHeight - 1); ++c) {
        let i_tile = c < tileCountWidth - 1 ? c : -1;
        let j_tile = c >= tileCountWidth - 1 ? c - (tileCountWidth - 1) : -1;

        let { tileCenterWidth, tileCenterHeight, cumulativeOffsetWidth, cumulativeOffsetHeight } = calculateTileCenterAndOffset(i_tile, j_tile, tileCountWidth, tileCountHeight, restWidth, restHeight)
        let offset_i = Math.floor((imageInputGaussian.width - (tileWidth + tileCenterWidth)) * randXorshiftFloat());
        let offset_j = Math.floor((imageInputGaussian.height - (tileHeight + tileCenterHeight)) * randXorshiftFloat());

        for (let j = 0; j < tileHeight + tileCenterHeight; ++j) {
            for (let i = 0; i < tileWidth + tileCenterWidth; ++i) {
                let w = calculateWeight(i, j, tileWidth, tileHeight, tileCenterWidth, tileCenterHeight);
                let index_i_output = customModulo(i + i_tile * tileWidth / 2 + cumulativeOffsetWidth, targetWidth);
                let index_j_output = customModulo(j + j_tile * tileHeight / 2 + cumulativeOffsetHeight, targetHeight);
                let index_i_input = (i + offset_i) % targetWidth;
                let index_j_input = (j + offset_j) % targetHeight;

                output.dataR[index_j_output][index_i_output] += w * imageInputGaussian.dataR[index_j_input][index_i_input];
                output.dataG[index_j_output][index_i_output] += w * imageInputGaussian.dataG[index_j_input][index_i_input];
                output.dataB[index_j_output][index_i_output] += w * imageInputGaussian.dataB[index_j_input][index_i_input];
            }
        }
    }
    return output
}


// algorithm main function
export async function makeTileable(_imageInput, _borderSize, canvas) {
    // Set random seed
    setSeed(4256)
    var borderSize = getBorderSize(_borderSize, _imageInput)
    let imageInput = imageDataToImageInput(_imageInput)
    // get algorithm parameters from UI
    var targetWidth = imageInput.width;
    var targetHeight = imageInput.height;
    // Compute adjusted optimal tile size for selected border size
    let tileParameters = calculateTileParameters(targetWidth, targetHeight, borderSize)
    // Allocate output image

    let output = emptyImageInput(targetWidth, targetHeight)
    if(canvas){
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageInputToImageData(output), 0, 0);
    }
    
    // 直接调用函数，不使用 withPerformanceLogging
    let imageGaussianedResult = await makeHistoGaussianEigen(imageInput);
    let { eigenVectors } = imageGaussianedResult
    let imageInputGaussian = imageGaussianedResult.output
    
    if(canvas){
        console.log(imageInputGaussian)
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageInputToImageData(imageInputGaussian), 0, 0);
    }
    
    applyBorderBlending(output, imageInputGaussian, targetWidth, targetHeight, borderSize);
    applyTileBlending(output, imageInputGaussian, tileParameters, targetWidth, targetHeight);
    
    // make output image have same histogram as input
    output = await unmakeHistoGaussianEigen(output, imageInput, eigenVectors);
    let outputImageData = imageInputToImageData(output)
    
    return outputImageData
}



