---
name: "导入素材"
version: "2.0.4"
name_en: "asset-import"
name_zh: "导入素材"
description: "将本地或对话中的素材添加到 ChatCut 项目。"
description_en: "Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Import local, attached, or downloaded media into a ChatCut project through the hosted external connector."
description_zh: "将本地或对话中的素材添加到 ChatCut 项目。"
user-invocable: "false"
displayName: "导入素材"
---
# 导入素材

优先替用户导入千问能读取的本地文件、对话附件或已下载的公共素材。先按 `chatcut-plugin-basics` 确定目标项目，并用 `browse_assets` 检查是否已存在，避免重复上传。说明所选素材会上传到 ChatCut 云端，不处理无关文件。

## 准备依赖

1. 确认千问能读取用户指定文件并执行命令。附件名不是文件路径；使用宿主实际返回的可读路径。公共 HTTP(S) 素材先下载到独立临时目录，不让后端读取千问本地路径。
2. 检查可用的 Node.js、`ffmpeg -version`、`ffprobe -version`。优先使用宿主已提供且可执行的 Node.js 或 PATH 中的版本；助手要求 Node.js 18+，不要猜测宿主应用内部路径。两个媒体工具都要检查，不重复安装可用依赖。
3. 缺依赖时由 Agent 说明用途，按当前宿主的安装权限流程下载或安装后继续，而不是直接让用户手动上传。Node.js 使用 [官方下载页](https://nodejs.org/en/download)；媒体工具使用系统已有的可信包管理器，或 [FFmpeg 下载页](https://ffmpeg.org/download.html)列出的、匹配当前系统和架构的构建。FFmpeg 官网提供源码及构建来源链接，不要把源码包当成可执行文件。校验发布方提供的校验和或签名。
4. 优先下载到用户可写的专用工具目录，避免修改系统配置或覆盖现有工具；需要管理员权限时让用户批准。安装后重新运行上述版本检查。未在 PATH 的工具，用真实绝对路径传给助手的 `--ffmpeg`、`--ffprobe` 参数。权限被拒绝时停止，不绕过限制。

ZIP 只包含官方上传脚本，不包含 ffmpeg/ffprobe 二进制。依赖安装按需进行；不因缺少浏览器工具而跳过可用的命令行导入。

## 自动导入

1. 文件与依赖就绪后，调用 `import_media({action: "create_session"})`，读取真实返回的短期 `token`、`endpoint`。只使用导入会话凭据，不提取 MCP OAuth、Cookie 或其他应用凭据，也不将 Token 放进用户回复或共享日志。
2. 前台运行本技能的 [scripts/upload-media.mjs](scripts/upload-media.mjs)，传入返回的 `--token`、`--endpoint` 和一个可读文件。多文件逐个处理，每个文件创建导入会话并记录结果；当前助手的多文件模式遇到一个失败会整体退出，不会返回完整的逐项结果。使用当前系统实际的 shell/进程调用方式，为每个参数正确引用；不要把文件路径、URL 或 Token 当作可执行代码，不后台脱离。
3. 助手负责媒体信息、必要转码、转录准备、存储上传和素材注册；不要手写元数据或用随意 PUT 请求替代。素材字节直传存储，不经 ChatCut API 服务转发。不要再调用不存在的 `import_media prepare/complete`，也不要调用后端专用 `push_asset`。
4. 成功时读取 stdout 的 `imports[].result.assetId`，再以 `browse_assets` 核对。失败时读取 stderr 的结构化错误；即使没有成功 JSON，也可能已注册素材，先按错误返回的 assetId 或文件信息检查素材库，不把“进程失败”当作“什么也没上传”。转录/字幕/Script 编辑前检查 `track_progress` 的 `transcription` 状态，云端渲染、导出、远程帧读取前检查所需素材的 `upload` 状态。
5. 错误包含结构化 `retry` 时据此恢复；需要新会话时用新返回的 token 和 endpoint 替换占位及旧值。沿用初次已验证的 Node 路径、`--ffmpeg`、`--ffprobe`、工作目录和转录选项，retry.args 不包含这些环境参数。复用已注册的 assetId，避免重复素材。一次有依据的恢复后仍是同一错误就停止并报告，不反复重建会话或换上传通道。

## 网页上传兜底

仅在无法读取素材、不能执行或安装依赖、上传被拒绝或确实失败时，提供工具实际返回的 `userUploadFallback.url` 或干净的项目编辑器链接，请用户在 ChatCut 上传。若宿主已有可用的浏览器文件上传能力，可以在授权范围内代为操作；没有时不假造浏览器工具。用户也可主动选择网页上传。上传后重新检查 `browse_assets`，再继续原任务。
