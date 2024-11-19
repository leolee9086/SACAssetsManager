import { addEcharts } from '../../DOM/addScript.js';
await addEcharts()

export function 创建柱状图像直方图配置(histogram) {
    // 找到数据中的最大值
    const maxR = Math.max(...histogram.r);
    const maxG = Math.max(...histogram.g);
    const maxB = Math.max(...histogram.b);
    const maxBrightness = Math.max(...histogram.brightness);
    const maxY = Math.max(maxR, maxG, maxB, maxBrightness);
    // 配置 ECharts 选项
    const option = {
        title: {
            text: '图像颜色直方图'
        },
        tooltip: {},
        legend: {
            data: ['红色', '绿色', '蓝色', '透明度', '亮度']
        },
        xAxis: {
            type: 'category',
            data: Array.from({ length: 256 }, (_, i) => i)
        },
        yAxis: {
            type: 'value',
            max: maxY * 1.1, // 设置 y 轴最大值为数据最大值的 110%
            scale: false // 自动调整 y 轴

        },
        series: [
            {
                name: '红色',
                type: 'bar',
                data: histogram.r,
                itemStyle: { color: 'red' }
            },
            {
                name: '绿色',
                type: 'bar',
                data: histogram.g,
                itemStyle: { color: 'green' }
            },
            {
                name: '蓝色',
                type: 'bar',
                data: histogram.b,
                itemStyle: { color: 'blue' }
            },
        
            {
                name: '亮度',
                type: 'bar',
                data: histogram.brightness,
                itemStyle: { color: 'yellow' }
            }
        ]
    };
    return option
}
export const 创建经典直方图配置 = (channels,histogram) => {
 
    return {
        backgroundColor: '#1e1e1e',
        grid: {
          top: 5,
          right: 5,
          bottom: 5,
          left: 5,
          containLabel: false
        },
        xAxis: {
          type: 'category',
          data: Array.from({ length: 256 }, (_, i) => i),
          show: false
        },
        yAxis: {
          type: 'value',
          show: false
        },
        series: channels
          .filter(channel => channel.visible)
          .map(channel => ({
            name: channel.label,
            type: 'line',
            data: histogram[channel.key],
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: channel.color,
              width: 1,
              opacity: 0.8
            },
            areaStyle: {
              color: channel.color,
              opacity: 0.3
            }
          }))
        };
    }
  