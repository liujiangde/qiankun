// 拨测相关 mock 数据集中在这里，页面不再直接维护大段演示数据。
export const tbDetectionAlertMockRecords = [
  {
    id: 1,
    content: '测试告警',
    createTime: '2026-04-22T18:00:00',
    resultId: null,
    ruleId: 1,
    managementIP: '172.16.1.21',
    target: '147.95.205.11:22',
    ruleName: '测试规则',
    alertCondition: 'all'
  },
  {
    id: 2,
    content: '端口可达性波动',
    createTime: '2026-04-21T15:20:00',
    resultId: 12001,
    ruleId: 2,
    managementIP: '172.16.1.22',
    target: '10.20.0.8:443',
    ruleName: '链路拨测规则',
    alertCondition: 'any'
  },
  {
    id: 3,
    content: '响应延迟超阈值',
    createTime: '2026-04-20T08:40:00',
    resultId: null,
    ruleId: 3,
    managementIP: '172.16.1.23',
    target: '10.20.0.9:80',
    ruleName: 'HTTP 时延规则',
    alertCondition: 'all'
  },
  {
    id: 4,
    content: 'DNS 拨测失败',
    createTime: '2026-04-19T11:05:00',
    resultId: 12002,
    ruleId: 4,
    managementIP: '172.16.1.24',
    target: '8.8.8.8:53',
    ruleName: 'DNS 可用性规则',
    alertCondition: 'any'
  },
  {
    id: 5,
    content: 'SSH 连通性异常',
    createTime: '2026-04-18T22:12:00',
    resultId: null,
    ruleId: 5,
    managementIP: '172.16.1.25',
    target: '192.168.100.10:22',
    ruleName: '主机 SSH 规则',
    alertCondition: 'all'
  }
]
