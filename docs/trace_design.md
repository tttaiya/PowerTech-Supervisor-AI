# Trace 设计

## 目标

每次 AIOps 诊断都生成 `trace_id`，并记录 Planner、Executor、Replanner 的节点输入输出、最终报告和工具调用记录。

## 节点记录

### Planner

- 输入快照：`session_id`、`trace_id`
- 输出快照：`plan`
- 汇总字段：`planner_output`

### Executor

- 输入快照：`session_id`、`trace_id`
- 输出快照：`plan`、`past_steps`
- 汇总字段：`executor_steps`

### Replanner

- 输入快照：`session_id`、`trace_id`
- 输出快照：`replanner_action`、`plan`、`response`
- 汇总字段：`replanner_decisions`

## 价值

- 通过 `trace_id` 串联 SSE 事件和本地 trace 文件。
- 支持定位规划错误、执行错误、重规划过早结束等问题。
- 为后续 bad case 复盘提供结构化证据。
