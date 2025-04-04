import kernelApi from "../../../polyfills/kernelApi.js";



export const 生成文档数量趋势图 = async (startDate, endDate) => {
  // 按创建日期统计文档数量
  const sql = `
    SELECT 
      date(created, 'unixepoch', 'localtime') as date,
      count(*) as count 
    FROM blocks 
    WHERE type = 'd' 
      ${startDate ? `AND created >= strftime('%s', '${startDate}')` : ''}
      ${endDate ? `AND created <= strftime('%s', '${endDate}')` : ''}
    GROUP BY date(created, 'unixepoch', 'localtime')
    ORDER BY date ASC
  `;
  
  // 获取数据
  const data = await kernelApi.SQL(sql);
  
  // 处理数据格式
  const option = {
    title: {
      text: '文档创建趋势'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      name: '日期'
    },
    yAxis: {
      type: 'value',
      name: '文档数量'
    },
    series: [{
      name: '新增文档数',
      type: 'line',
      smooth: true,
      data: data.map(item => item.count),
      markPoint: {
        data: [
          { type: 'max', name: '最大值' },
          { type: 'min', name: '最小值' }
        ]
      },
      markLine: {
        data: [
          { type: 'average', name: '平均值' }
        ]
      }
    }]
  };

  return option;
}