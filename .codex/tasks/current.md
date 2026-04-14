你现在正在执行 Phase 6。

目标：
- 只实现 chat 最小 SSE 闭环

必须完成：
- POST /conversations/:id/messages
- SSE 事件仅支持：
  - ack
  - delta
  - completed
  - conversation.updated
  - profile.updated
  - error
  - done
- assistant 消息只在完成后落完整内容
- 首轮 assistant 回复完成后自动生成标题

强约束：
- 不进入 V2 功能
- 不做每个 delta 落库
- 不破坏已有 schema / migration

禁止：
- 不要擅自扩展 SSE 事件范围
- 不要擅自修改 shared contracts，除非编译必须
