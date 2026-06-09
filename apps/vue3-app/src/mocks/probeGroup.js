// 探针分组管理 mock 数据，供列表、启停、删除等本地演示逻辑使用。
export const probeGroupMockRecords = [
  {
    id: 1,
    name: 'Web服务器组-上海',
    type: '物理',
    region: '上海',
    collectorCount: 8,
    status: '已启用',
    createdAt: '2024/01/15 16:30',
    rule: JSON.stringify({
      ruleGroup: [{ field: 'hostname', operator: 'contains', value: 'web' }],
      relation: 'or',
      matchedCollectors: [
        {
          id: 1,
          name: 'web-server-sh-01',
          ip: '192.168.1.10',
          status: '在线',
          type: '物理',
          region: '上海'
        },
        {
          id: 2,
          name: 'web-server-sh-02',
          ip: '192.168.1.11',
          status: '在线',
          type: '物理',
          region: '上海'
        }
      ],
      collectors: [
        {
          id: 1,
          name: 'web-server-sh-01',
          ip: '192.168.1.10',
          status: '在线',
          type: '物理',
          region: '上海'
        }
      ]
    })
  },
  {
    id: 2,
    name: '数据库服务器组-上海',
    type: '容器',
    region: '上海',
    collectorCount: 3,
    status: '已启用',
    createdAt: '2024/01/16 17:00'
  },
  {
    id: 3,
    name: '虚拟机组-北京生产',
    type: '虚拟机',
    region: '北京',
    collectorCount: 12,
    status: '已启用',
    createdAt: '2024/01/18 15:15'
  },
  {
    id: 4,
    name: 'K8S生产集群监控',
    type: '容器',
    region: '上海',
    collectorCount: 11,
    status: '已启用',
    createdAt: '2024/01/20 19:00'
  },
  {
    id: 5,
    name: '测试环境-上游',
    type: '虚拟机',
    region: '上海',
    collectorCount: 2,
    status: '未启用',
    createdAt: '2024/01/22 23:20'
  },
  {
    id: 6,
    name: 'API服务器组-北京',
    type: '物理',
    region: '北京',
    collectorCount: 5,
    status: '已启用',
    createdAt: '2024/01/26 00:00'
  },
  {
    id: 7,
    name: 'K8S开发集群',
    type: '容器',
    region: '北京',
    collectorCount: 2,
    status: '已启用',
    createdAt: '2024/01/28 17:30'
  },
  {
    id: 8,
    name: '缓存服务组集群',
    type: '物理',
    region: '上海',
    collectorCount: 1,
    status: '已启用',
    createdAt: '2024/02/01 18:00'
  }
]

export const probeCollectorMockRecords = [
  { id: 1, name: 'web-server-sh-01', ip: '192.168.1.10', status: '在线', type: '物理', region: '上海' },
  { id: 2, name: 'web-server-sh-02', ip: '192.168.1.11', status: '在线', type: '物理', region: '上海' },
  { id: 3, name: 'db-server-sh-01', ip: '192.168.2.20', status: '在线', type: '物理', region: '上海' },
  { id: 4, name: 'app-server-sh-01', ip: '192.168.1.15', status: '离线', type: '容器', region: '上海' },
  { id: 5, name: 'cache-server-sh-01', ip: '192.168.3.30', status: '在线', type: '物理', region: '上海' },
  { id: 6, name: 'api-server-sh-01', ip: '192.168.1.12', status: '在线', type: '物理', region: '上海' },
  { id: 7, name: 'api-server-sh-02', ip: '192.168.1.13', status: '在线', type: '物理', region: '上海' },
  { id: 101, name: 'web-server-bj-01', ip: '10.0.1.10', status: '在线', type: '物理', region: '北京' },
  { id: 102, name: 'web-server-bj-02', ip: '10.0.1.11', status: '离线', type: '物理', region: '北京' }
]
