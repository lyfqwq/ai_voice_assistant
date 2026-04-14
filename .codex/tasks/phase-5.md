你现在正在执行 Phase 5。

目标：
- 只实现 conversations 最小闭环
- 不进入 chat SSE

必须完成：
- POST /conversations
- GET /conversations
- GET /conversations/:id/messages

强约束：
- conversations.title 默认 '新对话'
- conversations.title_generated 默认 false
- 仅实现当前 phase 所需查询与写入

禁止：
- 不要进入 chat SSE
- 不要擅自修改 shared contracts，除非编译必须
