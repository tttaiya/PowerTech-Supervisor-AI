# Day06 上下文压缩设计与执行说明

## 为什么要做

AIOps Agent 会调用日志、监控、知识库等工具。真实生产日志经常很长，如果全部塞回 LLM，会带来三个问题：上下文超长、成本升高、关键信息被噪声淹没。因此 Day06 增加上下文压缩层，把长工具输出先转成结构化摘要，再进入 trace 和后续推理。

## 怎么加的

代码入口是 `app/services/context_compressor.py`，核心类是 `ContextCompressor`。它会抽取 affected_service、time_range、key_errors、metric_abnormalities、possible_causes、evidence_snippets 和 confidence。

集成点在 `app/agent/tool_executor.py` 的 `_summarize_result()`。工具原始结果仍然保存到 `traces/raw_outputs/{trace_id}/{tool_call_id}.json`，trace 中只保存压缩摘要，兼顾可解释性和可追溯性。

## 操作步骤

1. 打开 `app/services/context_compressor.py`，查看 `compress()` 方法。
2. 打开 `app/agent/tool_executor.py`，确认 `_summarize_result()` 调用了 `context_compressor.compress()`。
3. 运行测试：

```powershell
pytest tests\test_day06_10_features.py -q
```

## 验收标准

- 长日志输入会返回 `compressed=True`。
- 摘要中包含受影响服务、关键错误和异常指标。
- 工具原始输出不会丢失，只是 trace 中展示压缩后的摘要。

## 亮点和思考

这个改造的亮点不是简单截断字符串，而是把日志压缩成可供 Agent 继续推理的结构化证据。面试讲解时可以强调：我把“省 token”和“保留证据链”拆开处理，trace 保存摘要，raw output 保存原文，既降低上下文压力，也支持事后复盘。

## 面试题

1. 为什么不能直接把完整工具输出全部交给大模型？
2. 上下文压缩和简单字符串截断有什么区别？
3. 如何避免压缩阶段丢失关键证据？
4. 如果日志里没有明显错误关键字，你会怎么降级？
5. 你如何验证上下文压缩没有影响最终诊断质量？
