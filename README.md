# agent-pitch-template

把一份 PPT 变成「agent 对话式讲解」的商业计划书:agent 一句句讲,每章弹出一张展示卡(数字卡、图表、同心圆位置图、场景卡、路线图……),有自动播放、暂停、调速和中英切换。

**最终产出是一个本地 HTML 文件**:双击就能在浏览器里打开,不需要服务器、域名,也不用联网。要给别人看,直接发这个文件。

样例:运行 `python3 tools/build.py examples/tradefons`,打开 `dist/tradefons-example.html`。这是 tradefons 商业计划的脱敏版,里面的市场数字是 2026-10-27 的公开数据,只用来演示格式。

## 用法:交给你的 AI agent

适用于 Codex、Kiro、Claude Code、Cursor 等能读写本地文件、能运行命令的 agent。

1. 下载或克隆这个仓库,用你的 IDE / agent 打开这个文件夹。
2. 把你的 PPT 放进文件夹(任意位置),对 agent 说:

   > 用这个模板把 `我的计划书.pptx` 做成 pitch。

3. agent 会自动读取 `skills/pitch-builder/SKILL.md`,依次:
   - 拆解 PPT(文字、演讲者备注、表格、图表数据、图片)
   - **先给你一份章节大纲确认**
   - 写 `deck/deck.json` → 校验 → 打包成 `dist/pitch.html`
4. 双击 `dist/pitch.html` 查看。不满意就直接跟 agent 说要改哪里,它改完重新打包。

各工具读取说明的位置都已放好:Codex 读 `AGENTS.md`,Kiro 读 `.kiro/steering/`,Claude Code 读 `CLAUDE.md` 和 `.claude/skills/`。

## 自己动手

需要 Python 3.9+。

```sh
pip install -r requirements.txt                 # 只有拆 PPT 需要
python3 tools/pptx_extract.py 我的计划书.pptx    # → source/slides.md + deck/assets/
# 编辑 deck/deck.json(组件说明见 skills/pitch-builder/SKILL.md)
python3 tools/validate.py                        # 检查
python3 tools/build.py                           # → dist/pitch.html
```

可选:装了 Node 和 Playwright 时,`node tools/smoke.js dist/pitch.html` 会逐章打开截图并报告错误。

## 目录

```
deck/deck.json        你的内容(唯一需要改的文件)
deck/assets/          图片、logo
engine/               播放器和样式(不用改)
tools/                拆 PPT、校验、打包、渲染检查
skills/pitch-builder/ 给 agent 的完整说明
examples/tradefons/   示例 deck
```

## License

MIT
