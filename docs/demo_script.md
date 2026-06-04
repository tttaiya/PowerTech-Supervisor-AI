# Day09 项目演示脚本

## 讲解主线

这个项目是一个智能 OnCall 运维助手。原始能力是 RAG 问答和 AIOps 自动诊断，本轮差异化改造后增加了 trace 可观测性、工具治理、上下文压缩、bad case 复盘、截图告警入口和评测集。

## 演示顺序

1. 打开首页和 API 文档，说明项目是 FastAPI + LangChain + LangGraph + Milvus。
2. 调用 RAG 问答，展示知识库能回答运维 SOP。
3. 调用 `/api/aiops`，展示 Plan-Execute-Replan 诊断过程。
4. 打开 `traces/`，展示 trace_id、节点记录、工具调用摘要和最终状态。
5. 展示 `docs/trace_design.md` 和 `docs/tool_system_design.md`，说明可观测性和工具治理。
6. 调用 `/api/badcases`，说明失败样例如何沉淀。
7. 调用 `/api/aiops/screenshot`，说明截图告警如何变成结构化诊断任务。
8. 展示 `eval/agent_eval_cases.json`，说明如何做回归评测。

## 重点话术

我没有把 Agent 当成一个黑盒聊天接口，而是围绕生产可用性做了增强：每次诊断都有 trace，每次工具调用有状态和摘要，长日志会压缩，失败案例会沉淀，多模态告警可以进入诊断链路，最后还有固定评测集用于回归。

## 面试题

1. 你的项目和普通 RAG Demo 最大区别是什么？
2. 为什么 AIOps 需要 Plan-Execute-Replan？
3. trace 如何帮助定位 Agent 的错误？
4. 工具治理解决了哪些稳定性问题？
5. 为什么要把截图告警纳入演示？
