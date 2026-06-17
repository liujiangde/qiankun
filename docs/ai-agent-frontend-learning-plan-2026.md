# AI Agent 前端开发工程师学习计划（2026）

本文档基于当前 AI Agent 前端岗位要求整理，目标是帮助前端工程师系统补齐大厂、AI 独角兽和创业公司 JD 中高频出现的能力项，并最终形成可展示、可面试、可写入简历的项目成果。

## 1. 目标定位

建议不要五类公司平均学习。更高性价比的主线是：

> AI Agent 前端基础设施 + IDE Agent 工具链

这条路线可以同时覆盖以下岗位方向：

- 字节 TRAE / AI IDE / AI 编程 Agent
- Coze / Dify / 企业 Agent 搭建平台
- 阿里云 / 百度千帆 / 华为云 / 腾讯混元 Agent 平台
- AI 独角兽和中大型创业公司的 Agent 产品前端岗位

最终应该形成两个核心作品：

1. Coze-lite Agent Builder：面向企业 Agent 搭建平台。
2. TRAE-lite IDE Agent：面向 AI 编程工具和 IDE Agent。

## 2. 学习路线总览

| 阶段 | 时间 | 核心目标 | 验收产物 |
| --- | --- | --- | --- |
| 前端硬基础补强 | 第 1-2 周 | TS 类型、React/Vue3、Vite、状态管理、虚拟列表、错误边界、测试 | AI Chat Shell |
| 流式与 Agent 基础 | 第 3-4 周 | SSE、WebSocket、Abort、重连、分片缓冲、Function/Tool Calling | `useAgentStream` 封装 |
| Agent 工作流平台 | 第 5-7 周 | 节点画布、Persona、Skill、插件配置、Agent 状态机 | Coze-lite 原型 |
| RAG 与知识库前端 | 第 8-9 周 | 文件上传、PDF/文本解析、分片预览、检索结果可视化、引用定位 | 知识库管理页 |
| MCP 与工具生态 | 第 10-11 周 | MCP Client/Server 概念、工具发现、工具参数 schema、调用审批流 | MCP 工具面板 |
| IDE Agent 专项 | 第 12-14 周 | VS Code 插件、Monaco、Electron、本地文件扫描、代码上下文管理 | TRAE-lite 原型 |
| 工程化与面试包装 | 第 15-16 周 | 性能监控、Token 成本、权限、安全、测试、部署、简历项目化 | 作品集 + 技术方案文档 |

## 3. 每日学习节奏

工作日每天建议投入 2-3 小时：

1. 40 分钟阅读官方文档或优秀开源项目源码。
2. 90 分钟写功能，不只看教程。
3. 30 分钟写技术笔记，记录问题、方案、取舍和性能指标。

周末建议用半天时间做集成，把本周能力合并到项目中。每周必须有一个可以运行、可以截图、可以讲清楚技术方案的产物。

## 4. 第一阶段：前端硬基础补强（第 1-2 周）

### 学习目标

补齐所有 AI Agent 前端岗位都会考察的基础能力，重点不是重复学习框架 API，而是把基础能力用于复杂交互场景。

### 必学内容

- TypeScript 高级类型、泛型、类型收窄、类型守卫。
- React 或 Vue3 的复杂组件拆分。
- Vite 工程化、环境变量、构建优化。
- 状态管理：useReducer、Zustand、Pinia 或 Redux Toolkit。
- 大列表渲染、虚拟滚动、消息列表滚动锚定。
- Markdown、代码块、高亮、复制、折叠。
- 错误边界、空状态、加载态、重试态。
- 单元测试和组件测试。

### 实战任务

实现一个 AI Chat Shell：

- 支持用户输入、消息列表、AI 回复。
- 支持 Markdown、代码块、表格、引用。
- 支持 loading、error、empty、retry。
- 支持长消息列表不卡顿。
- 支持移动端和桌面端响应式布局。

### 验收标准

- 消息超过 500 条时页面仍可正常滚动。
- 长代码块不会撑破布局。
- 错误状态可以恢复。
- 核心状态逻辑有测试覆盖。

## 5. 第二阶段：流式与 Agent 基础（第 3-4 周）

### 学习目标

掌握普通前端和 AI Agent 前端的关键分水岭：流式交互、工具调用、长任务状态管理。

### 必学内容

- SSE / EventSource。
- fetch stream / ReadableStream。
- WebSocket 双向通信。
- AbortController 取消请求。
- 断线重连、指数退避、请求幂等。
- 消息分片缓冲、增量渲染、打字机效果。
- Function Calling / Tool Calling 的前端表现。
- 工具调用审批流、工具执行中、执行成功、执行失败、重试。

### 实战任务

封装 `useAgentStream`：

```ts
type AgentStreamStatus = 'idle' | 'connecting' | 'streaming' | 'tool_calling' | 'done' | 'error';

interface AgentStreamEvent {
  type: 'message_delta' | 'tool_call' | 'tool_result' | 'error' | 'done';
  payload: unknown;
}
```

要求支持：

- 开始生成。
- 停止生成。
- 重试生成。
- 断线重连。
- 工具调用卡片。
- 错误兜底。
- 本地 mock stream 和真实接口适配。

### 验收标准

- AI 输出中断后不会继续写入 UI。
- 工具调用失败后能重试。
- 网络异常后有清晰状态提示。
- 快速连续发送不会造成消息错位。

## 6. 第三阶段：Agent 工作流平台（第 5-7 周）

### 学习目标

对标 Coze、Dify、阿里云 Agent 平台，掌握节点式工作流和低代码 Agent 搭建能力。

### 必学内容

- React Flow / Vue Flow。
- 节点、边、拖拽、缩放、框选。
- 节点配置面板。
- Persona 人设配置。
- Skill 配置。
- Prompt 模板管理。
- Agent 工作流执行状态。
- 节点级日志、耗时、输入输出。

### 实战任务

实现 Coze-lite Agent Builder：

- 支持 Start、LLM、Tool、Knowledge、Condition、End 节点。
- 支持节点拖拽、连线、删除、复制。
- 支持右侧配置面板。
- 支持 Persona、Skill、Prompt 参数配置。
- 支持点击运行后展示执行路径。
- 支持失败节点高亮和错误详情。

### 验收标准

- 至少支持 6 种节点。
- 节点参数能保存到本地。
- 工作流可以导出和导入 JSON。
- 执行过程有可视化时间线。

## 7. 第四阶段：RAG 与知识库前端（第 8-9 周）

### 学习目标

掌握企业 Agent 平台高频能力：知识库上传、文档分片、Embedding 状态、检索结果可视化。

### 必学内容

- 文件上传、大文件分片上传。
- PDF / Markdown / TXT 前端预览。
- 文档分片策略展示。
- Embedding 任务状态展示。
- 向量库集合、文档、chunk 的前端管理。
- 检索结果、相似度、引用来源展示。
- 多知识库选择。

### 实战任务

实现知识库管理页：

- 上传文档。
- 展示解析状态。
- 展示 chunk 列表。
- 支持检索测试。
- 展示召回结果、相似度、来源段落。
- 在 AI 回复中展示引用来源。

### 验收标准

- 上传失败、解析失败、Embedding 失败都有明确提示。
- 检索结果能定位到原文片段。
- 支持多文档管理。
- 支持批量删除和重新解析。

## 8. 第五阶段：MCP 与工具生态（第 10-11 周）

### 学习目标

掌握新一代 Agent 工具生态的关键协议能力，能把工具发现、工具调用和前端审批流串起来。

### 必学内容

- MCP 的 Client / Server / Tool / Resource 基础概念。
- 工具 schema 展示。
- 动态表单生成。
- 工具参数校验。
- 工具调用权限确认。
- 工具执行结果渲染。
- 多工具串行和并行状态展示。

### 实战任务

实现 MCP 工具面板：

- 列出可用工具。
- 点击工具后展示参数表单。
- 根据 JSON Schema 自动生成输入控件。
- 调用前展示审批弹窗。
- 调用后展示结果、耗时、错误。
- 支持把工具调用结果插入会话上下文。

### 验收标准

- 工具 schema 改变后 UI 能自动适配。
- 参数错误能在前端提示。
- 高风险工具必须二次确认。
- 工具调用记录可以追溯。

## 9. 第六阶段：IDE Agent 专项（第 12-14 周）

### 学习目标

对标 TRAE、Cursor、AI 编程 Agent 岗位，补齐 VS Code 插件、Monaco、Electron、本地文件上下文管理能力。

### 必学内容

- VS Code Extension API。
- Webview 通信。
- Monaco Editor。
- Electron 桌面应用基础。
- 本地文件扫描。
- 代码上下文选择。
- 依赖跳转交互。
- AI 代码 diff 展示。
- 重构建议面板。

### 实战任务

实现 TRAE-lite IDE Agent：

- VS Code 插件侧边栏。
- 选择当前文件或目录作为上下文。
- 展示 AI 分析结果。
- 展示代码修改 diff。
- 支持一键应用修改。
- 支持工具调用过程展示，例如读取文件、搜索符号、生成 patch。

### 验收标准

- 插件可以在 VS Code Extension Host 中运行。
- 能读取当前打开文件内容。
- 能展示 AI 建议和 diff。
- 能把工具调用过程可视化。
- 对危险修改有确认流程。

## 10. 第七阶段：工程化与面试包装（第 15-16 周）

### 学习目标

把能力从 demo 打磨成能投递简历、能讲技术方案、能应对面试追问的项目。

### 必学内容

- 前端性能监控。
- Token 成本统计。
- Agent 执行 trace。
- 权限控制。
- 数据脱敏。
- 前端安全。
- 测试策略。
- 部署和演示环境。
- 技术方案文档。

### 实战任务

为两个作品补齐工程化能力：

- README。
- 架构图。
- 技术选型说明。
- 核心流程图。
- 性能优化说明。
- 风险和边界说明。
- 演示截图或录屏。

### 验收标准

- 能 5 分钟演示作品。
- 能 10 分钟讲清楚架构。
- 能回答为什么这样设计。
- 能解释性能、异常、安全、权限和成本控制。

## 11. 能力优先级

### 第一优先级：必须掌握

- SSE / WebSocket 流式渲染。
- 断线重连、消息缓冲、取消生成。
- Tool Calling UI。
- 节点工作流画布。
- RAG 前端链路。
- IndexedDB 本地持久化。
- React/TS 或 Vue3/TS 复杂组件工程能力。

### 第二优先级：冲击高薪岗位

- VS Code 插件开发。
- Monaco 编辑器。
- Electron 桌面应用。
- MCP 协议适配。
- Agent 执行链路可视化。
- Token 成本和 trace 可观测性。

### 第三优先级：加分项

- WebGPU。
- ONNX Runtime Web。
- Transformers.js。
- 前端本地推理。
- 多模态文件、图片、音频解析。
- Agent 评测体系。

## 12. 作品集规划

### 12.1 Coze-lite Agent Builder

定位：企业 Agent 搭建平台。

核心功能：

- 节点式 Agent 工作流。
- Persona 配置。
- Skill 配置。
- Prompt 模板。
- Tool Calling。
- RAG 知识库。
- 执行日志。
- Token 成本。
- 导入导出。

适配岗位：

- Coze / Dify 类平台。
- 阿里云 Agent 平台。
- 百度千帆 / 华为云盘古 Agent。
- AI 独角兽 Agent 产品前端。

简历表述示例：

> 独立实现可视化 Agent 编排平台，支持节点拖拽、Tool Calling、RAG 检索链路展示、流式执行日志和 Token 成本统计，封装通用 Agent Stream SDK，解决长任务状态同步、消息分片缓冲和异常重试问题。

### 12.2 TRAE-lite IDE Agent

定位：AI 编程 Agent 和 IDE 工具。

核心功能：

- VS Code 插件。
- Monaco 编辑器。
- Webview 通信。
- 本地文件上下文选择。
- 代码 diff。
- AI 重构面板。
- 工具调用过程展示。
- 一键应用修改。

适配岗位：

- TRAE。
- Cursor 类 AI IDE。
- VS Code 插件开发岗位。
- AI 编程工具前端岗位。

简历表述示例：

> 设计并实现 AI 编程 Agent 插件，支持本地工程上下文采集、代码依赖跳转、LLM 流式分析、工具调用可视化和 diff 应用流程，具备 VS Code Extension、Monaco Editor 与 Electron 桌面端开发经验。

## 13. 面试准备清单

### 前端基础

- 解释 SSE 和 WebSocket 的区别。
- 解释浏览器如何处理流式响应。
- 解释 React/Vue 中如何优化长消息列表。
- 解释 AbortController 如何取消请求。
- 解释虚拟列表如何处理动态高度。
- 解释前端如何做错误恢复和重试。

### Agent 专项

- 解释 Function Calling / Tool Calling 的完整流程。
- 解释 Agent 和普通 ChatBot 的区别。
- 解释 MCP 解决了什么问题。
- 解释 RAG 前端需要展示哪些状态。
- 解释 Persona、Skill、Tool、Memory 的区别。
- 解释如何设计 Agent 执行日志和 trace。

### 工程化

- 如何避免 API key 泄露到前端。
- 如何处理 Token 成本展示。
- 如何设计工具调用审批流。
- 如何做权限隔离和数据脱敏。
- 如何测试流式输出。
- 如何保证节点画布在大规模节点下不卡顿。

## 14. 官方资料入口

- [MDN Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [OpenAI Streaming Responses](https://platform.openai.com/docs/guides/streaming-responses)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)
- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [React Flow](https://reactflow.dev/api-reference/react-flow)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Dify Agent Documentation](https://docs.dify.ai/en/use-dify/nodes/agent)

## 15. 推荐执行顺序

如果时间有限，优先按下面顺序执行：

1. 先做 AI Chat Shell。
2. 再封装 `useAgentStream`。
3. 再做 Tool Calling UI。
4. 再做节点工作流画布。
5. 再做 RAG 知识库管理页。
6. 最后做 VS Code 插件和 IDE Agent。

不要一开始就投入 WebGPU、本地推理或复杂多模态。它们是加分项，但不是大多数 AI Agent 前端岗位的核心门槛。

## 16. 最终交付标准

16 周结束时，至少应该具备以下成果：

- 一个 Coze-lite Agent Builder。
- 一个 TRAE-lite IDE Agent。
- 一份项目 README。
- 一份技术方案文档。
- 一份面试题和答案笔记。
- 一份简历项目描述。
- 一段 3-5 分钟项目演示视频或录屏。

最终目标不是“学过很多关键词”，而是能拿出真实可运行的 Agent 前端工程项目，并能讲清楚其中的技术难点、架构取舍和业务价值。
