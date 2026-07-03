# Day09/Day10 手工评测执行说明

## 为什么要做

Agent 项目不能只靠“看起来回答不错”验收。Day09/Day10 增加评测集和演示检查表，用固定样例覆盖 RAG、异常和前端流式容错场景，让优化效果可以被复现和比较。

## 评测文件

评测集位置：

```text
eval/agent_eval_cases.json
```

当前覆盖：

- RAG：8 个
- 异常：4 个

## 操作步骤

1. 启动服务：

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 9900
```

2. 检查健康状态：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:9900/api/health"
```

3. 对 RAG 用例调用 `/api/chat` 或 `/api/chat_stream`。
4. 异常用例主要通过单元测试、工具执行器测试和前端流式容错验证。

## 评分建议

每个用例按 0-2 分评分：

- 0 分：未回答或明显错误。
- 1 分：方向正确但证据不足。
- 2 分：回答正确且有证据链、trace 或可操作建议。

## 验收标准

- 固定用例能稳定执行。
- 每类场景都有样例覆盖。
- 失败样例能进入 bad case 复盘。
- Demo 时能展示 trace、压缩摘要、bad case 和引用溯源。

## 面试题

1. Agent 评测为什么要分场景？
2. RAG 问答和异常场景的评测标准有什么不同？
3. 你如何定义一个回答“可用”？
4. 评测集中异常样例有什么价值？
5. 如何用评测集证明优化真的有效？
