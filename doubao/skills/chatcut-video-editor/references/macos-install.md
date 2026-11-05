# macOS 安装验证

把 DMG 中的源应用、复制后的暂存应用和最终安装应用视为三个不同产物，并在
每一步保留真实退出码和相关 stderr。

1. 将匹配架构的 DMG 下载到新临时目录。先运行 `hdiutil verify`，再以
   read-only、nobrowse 方式挂载到本次操作独有的临时挂载点；不要复用已有的
   `/Volumes/ChatCut*`。
2. 改动现有应用前，对挂载目录中的 `ChatCut.app` 运行：

   ```sh
   /usr/bin/codesign --verify --deep --strict --verbose=4 "<mount>/ChatCut.app"
   /usr/sbin/spctl --assess --type execute --verbose=4 "<mount>/ChatCut.app"
   /usr/bin/codesign -d --verbose=4 "<mount>/ChatCut.app"
   ```

   正式版应显示 bundle identifier `io.chatcut.desktop`、Team ID
   `7WK2VURFPK`、签名主体
   `Developer ID Application: ChatCut Inc. (7WK2VURFPK)`，Gatekeeper
   source 为 `Notarized Developer ID`。
3. 优先安装到 `/Applications/ChatCut.app`；若无法获得这一窄范围授权，再用
   `$HOME/Applications/ChatCut.app`。禁止把新 bundle 合并复制到已存在的
   bundle 上。
4. 用 `/usr/bin/ditto` 复制到目标卷上不存在的唯一暂存路径，例如
   `.ChatCut.install-<unique>.app`。对暂存应用重复 `codesign` 和 `spctl`。
   若挂载源通过而暂存失败，只删除本次暂存副本并重试复制一次。
5. 获得确认后退出旧 ChatCut，把现有目标移到唯一备份路径，原子地把验证过的
   暂存应用提升为 `ChatCut.app`，并再次验证最终路径。失败时恢复备份；只有
   最终应用验证并成功打开后才清理备份。
6. 卸载本次准确挂载点，只清理由本次操作创建的临时文件。清理失败不得覆盖
   安装结果。

## 安装完成后的连接验证

ChatCut 启动后会生成稳定的本地连接入口，供豆包预先绑定的 Connector 自动
发现；不要让用户手动填写本机入口路径或连接参数。工具加载后，必须在豆包
任务内调用 `get_active_project`，成功返回才算连接完成。

禁止修改或临时重签应用、关闭 Gatekeeper，或绕过无效签名。挂载源
`codesign` 失败才说明源 bundle 字节或结构异常；`codesign` 成功而 `spctl`
失败，应分别诊断公证、Gatekeeper、系统策略、quarantine 或网络。
