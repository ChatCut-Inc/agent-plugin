---
name: "创作偏好"
version: "2.0.4"
name_en: "widget-forms"
name_zh: "创作偏好"
description: "确认视频方向、风格与必要的创作偏好。"
description_en: "Ask for structured ChatCut input using the current plugin host's supported form surface."
description_zh: "确认视频方向、风格与必要的创作偏好。"
user-invocable: "false"
displayName: "创作偏好"
---
# 千问办公中的创作选择

使用千问当前实际提供的原生提问能力，例如 AskUserQuestion；没有时用一条简洁的普通对话问题。不要调用其他宿主的 `ask_followup_questions`、`visualize.show_widget`，也不要输出 ChatCut 内部 `<widget>`、`<choices/>` 或 `<clone-voice/>` 标签。

保留工作流传入的字段含义与选项 ID：文字输入就是文字问题，单选保留标签与真实 ID 的映射；需要明确同意的操作使用未预选的确认项并等待回答。已有明确授权不重复询问。

声音、MG 和数字人的预览，使用千问实际支持的图片/音频/视频展示方式。没有可用预览界面时说明可在 ChatCut 中预览，提供文字选择并保留稳定 ID；不要假造播放器、拼接 HTML 或将没有查看过的预览描述为已确认。

文件通过对话附件或用户提供的可读路径取得，再遵循 `asset-import`；不要把本地路径当作云端 assetId。声线克隆的同意和素材要求遵循 `voice`，附件本身不代表授权。
