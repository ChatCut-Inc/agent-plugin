# ChatCut 连接器准备

本能力通过千问市场中的 **ChatCut** 连接器操作 ChatCut 云端项目。认证方式为 OAuth，服务地址为 `https://api.chatcut.io/api/external-mcp/mcp`。市场 Server Key 为 `ChatCut`，区分大小写；不是密钥，不需要用户填写 Token。本包不使用 STDIO，也不安装 ChatCut Desktop。

## 每次执行前

先确认连接器就绪，再读取或修改项目。若当前宿主暴露 `qw_query`，按其实际参数结构查询 `qwenwork.settings.connector.market.ChatCut`。

- `installed=false`：使用当前 `qw_action` schema 支持的安装动作，或打开 ChatCut 市场页引导安装。不要把 Skill 的 `folderName` 安装参数当成连接器参数。
- `enabled=false` 且 `agentCanEnable=true`：按宿主支持的动作启用。
- `enabled=false` 且 `agentCanEnable=false`：打开连接器设置，请用户开启，然后暂停等待；不轮询、不绕过授权。
- 已启用但尚未连接：通过宿主的 connect/OAuth 入口请求用户登录 ChatCut；不要索取密码、Token 或 Cookie。
- 已连接：继续原始视频任务。每次安装、启用或授权处理后重新查询一次，确认成功才继续。
- 若返回 `UNKNOWN_KEY`：通过宿主实际提供的连接器发现能力或设置页核对市场条目，不猜测其他 key，不反复试错。`ChatCut` 是已安装市场记录中的标识；不要把市场记录的 UUID 自动当作 Server Key。

若 `qw_query` / `qw_action` 不可用，使用千问当前可用的连接器状态与工具发现能力。必要时引导到「扩展 → 连接器 → ChatCut」；套件用户也可以从详情页的「数据连接」进入。不能编造宿主没有暴露的调用方法。

使用延迟加载的 MCP 工具时，依次按实际 schema 调用 `qwenwork_mcp_tool_list`、`qwenwork_mcp_tool_get` 和 `qwenwork_mcp_tool_call`。若工具已直接暴露，则直接使用真实工具。参数、项目 ID 与支持的功能均以当前工具结果为准。

401 或明确的令牌失效，回到授权流程；403 先检查账号、项目归属与权限，不把所有权限错误当成重新登录即可解决。网络超时后先确认写入是否成功，不盲目重放创建、付费生成或导出任务。

## 确认与降级

修改云端项目以前，确认目标项目和拟执行的修改范围；用户已明确要求的具体操作可作为该范围的确认。新的实质性创作方向、删除或覆盖、付费生成超出已同意范围，以及对外发布或发送，需要另行确认。本地素材上传前说明将发送到 ChatCut 云端，仅处理用户指定的素材。

未连接或用户拒绝授权时，仍可基于用户提供的信息整理脚本、分镜或剪辑建议，但明确标注尚未写入 ChatCut。保留原始需求，恢复连接后继续；不得声称已生成素材、已编辑项目或已导出视频。

执行后简述结果、ChatCut 项目链接及用到的 ChatCut 连接器。网页编辑器与连接器应使用同一 ChatCut 账号。不要输出登录令牌或带临时凭据的分享链接。
