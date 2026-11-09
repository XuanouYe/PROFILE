# 在 Obsidian 编辑并发布

这整个 `PROFILE` 文件夹是你的 Obsidian 仓库。正式文章放在 `content/entries/` 中；新建笔记默认进入不会同步的 `content/drafts/`。

## 日常使用

1. 在左侧打开 `content` → `entries`，按主题（`film`、`music`、`opera`）、类型（`articles` 长文章、`logs` 短记录）和年份找到对应的 `.md` 文件。Obsidian 会自动保存到本地。
2. 如需查看实际网页，双击项目里的 `Preview.command`。浏览器会打开本地预览，保存文章后会自动刷新。预览窗口运行期间保留终端窗口。
3. 完成后，在右侧 Source Control 面板，点击顶部最左侧的 **Commit all changes and sync** 按钮。也可以直接按 **⌘⇧S**，或在命令面板搜索 **Git: Commit-and-sync**。
4. 看到 push 成功后，GitHub Actions 会自动检查并部署网站。可在 [发布记录](https://github.com/XuanouYe/PROFILE/actions) 查看进度。
5. 部署成功后访问 [在线网站](https://xuanouye.github.io/PROFILE/life/)。浏览器缓存可能需要刷新一次。

只在你主动同步时发布。定时提交、定时推送、退出后自动发布都没有启用。Obsidian Sync 付费服务不是这个流程的依赖。

## 改正文与 Details

文件开头两个 `---` 之间是属性；第二个 `---` 之后是正文。

- `title`：文章标题。
- `excerpt`：列表中的简介。短记录尚未写短评时可填 `""`，正文也可留空；长文章仍需填写简介。
- 短记录的 `excerpt` 和正文都为空时，只在 archive 收录，不出现在主页的 Recent log；填写短评后会自动进入主页候选列表。
- `subject`：只填 `film`、`opera`、`music` 其中一个。
- `publicationDate`：文章发布日期，使用 `YYYY-MM-DD`。原来没有日期的短记录保留 `null`。
- `longform: true`：出现在长文章目录中；短记录使用 `false`。
- `rating`：填写数字，如 `3.5`，网页会显示 `★★★☆`；未评分继续使用 `null`。
- `metadata`：按既有的电影、音乐或歌剧字段填写。
- 私人草稿请放在 `content/drafts/`，这个目录不会同步到公共仓库。`content/entries/` 和 `content/translations/en/` 只存放 `draft: false` 的公开定稿；如果误放草稿，提交检查会阻止同步。

`slug` 决定网页地址，统一使用 `主题-类型-日期-描述`，类型填单数 `article` 或 `log`，日期为首次命名时的 `publicationDate`，描述使用小写英文及连字符。无发布日期的短记录使用 `undated`，不要用制作年份或演出日期推测发布日期。

例如：`opera-log-2026-11-01-die-walkure-claus-guth`。文件名必须与 slug 一致，存放在 `content/entries/opera/logs/2026/`。歌剧短记录的描述使用作品名与导演名；音乐会记录使用指挥、独奏者或节目关键词；文章使用有意义的英文标题关键词。不要再用随机编号作为描述。

已发布的 slug 应保持稳定；确需修改时，把旧 slug 加入 `aliases` 列表，网站会生成旧网址到新网址的跳转。旧中文文章的 `/en/` 地址也会保留跳转。`related` 内引用的 slug 和正文中的站内链接应同步更新；英文翻译文件名也要改为新 slug。

## 添加文章

先复制 `templates/` 里的适合模板到 `content/drafts/`，用新的文件名与 slug 写作。准备公开时，改为 `draft: false`，再按主题、类型和发布日期年份移入对应目录，例如 `content/entries/film/articles/2026/`。无日期短记录放在对应的 `logs/undated/`。不要把“Format”或“Focus”字段加回来。

## 文章注释

正文中使用 `[^1]`、`[^2]` 标记注释，并在文章末尾用单独一行填写对应说明，例如 `[^1]: 这里填写注释内容。`。每条说明写成一个段落，可包含斜体和链接。网页会显示可点击的上标编号，文末统一列出 Notes，并提供返回正文的链接。同一注释可以多次引用。

图片说明也支持注释：`![图片描述](/assets/photo.jpg "图片说明[^1]")`。注释标记写在引号内的说明文字中即可。

## 图片和链接

可以直接把图片粘贴进文章；新图片会放到 `public/assets/uploads/`，使用普通 Markdown 图片语法。当前 Obsidian 配置会生成仓库内完整路径，发布程序会将 `public/assets/...` 转为网站的图片地址。

现有 `/assets/...` 图片链接继续有效。文章间的网页链接可使用 `/life/<slug>/`。请保留普通 Markdown 链接模式，不要改用 Obsidian 的 `[[双链]]` 作为网页链接。

## 出错时

- Git 提示有冲突：不要点击 discard 或强制推送。打开 Git 面板查看冲突；合并后再同步。
- Actions 显示红色：打开失败记录看错误位置。字段、日期或引用错误会阻止新版本发布；之前成功部署的网站仍保留。
- 本机提示认证失败：在终端执行 `~/.local/bin/gh auth login --hostname github.com --git-protocol https --web --scopes workflow`，完成 GitHub 官方登录后再同步。不要把访问令牌写进 `.md` 或插件配置。
- Git 面板未出现：在 Obsidian 的社区插件设置中启用 **Git**。这个项目已放好官方插件和设置。

## 网站和本地文件

- 网站：<https://xuanouye.github.io/PROFILE/life/>
- 源码：<https://github.com/XuanouYe/PROFILE>
- 部署记录：<https://github.com/XuanouYe/PROFILE/actions>
- 本地网页预览：<http://127.0.0.1:4174/life/>

`node_modules/`、`dist/`、本地预览文件和本机登录凭据不会提交。它们不是需要手工编辑的内容。GitHub 会自己从源码重新生成网页。

原始导入快照、导入清单、演示文章和旧导入脚本已删除，不保留本地副本。必要的网页图片会随定稿一起发布。
