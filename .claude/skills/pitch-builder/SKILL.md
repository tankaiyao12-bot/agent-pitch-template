---
name: pitch-builder
description: Turn a PowerPoint (.pptx) or written material into an interactive "agent talks you through it" pitch, delivered as ONE local HTML file that opens with a double click. Use when the user wants to make, update or restyle a pitch / business plan / deck with this template.
---

# pitch-builder

你在一个模板仓库里工作。目标:把用户的 PPT(或文字材料)改写成一份「agent 对话式讲解」的 pitch,最终交付 **一个本地 HTML 文件**(`dist/<name>.html`),双击即可在浏览器打开,不需要服务器、域名或网络。

效果参考:`dist/` 里没有文件时,先运行 `python3 tools/build.py examples/tradefons`,打开 `dist/tradefons-example.html` 看一遍。

## 你只改这些文件

| 改 | 不改 |
| --- | --- |
| `deck/deck.json`(全部内容)、`deck/assets/`(图片) | `engine/`(播放器、样式)、`tools/` |

需要的版式在下面的组件里没有时,先用现有组件组合;实在不够,在 `deck.json` 里用 `html` 组件,不要去改 `engine/`。

## 流程(按顺序,不要跳步)

1. **拆 PPT**
   `pip install python-pptx`(只需一次),然后 `python3 tools/pptx_extract.py <用户的.pptx>`。
   读 `source/slides.md`:每页的标题、正文、演讲者备注、表格、图表数据、图片(已存到 `deck/assets/sNN-K.*`)。
   没有 PPT 时,让用户给文字材料,跳到第 2 步。

2. **出章节大纲,等用户确认**(这一步必须停下来问)
   把 PPT 页映射成 6–12 章,用一张表给用户看:

   | # | 章节名 | 来自哪几页 | agent 讲什么(一句话) | 展示卡用什么组件 |

   规则:一章讲一件事;几页讲同一件事就合并;纯过渡页(目录、致谢)不单独成章。
   **用户确认前不写 deck.json。**

3. **写 `deck/deck.json`**
   - `say`:每章 2–3 句,口语、短句,像 agent 在当面讲。优先用演讲者备注改写,其次是页面要点。可以用 `<b>` 强调、`<span class="k">数字</span>` 高亮一个关键数字。
   - `blocks`:这一章的展示卡,通常 = 1 个 `title` + 1–2 个内容组件 + 1 个 `source`(有数字时)。
   - `ask`:1–2 个追问按钮。普通追问 = 进入下一章;`reply` = 就地回答(适合「数字哪来的?」);最后一章放 `{"restart": true}`。
   - `brand`:名称、logo(放 `deck/assets/`)、主色 `accent` 和深一号的 `accentDark`(取 PPT 主色)。
   - 语言:`meta.langs` 默认 `["zh","en"]`,每段文字写 `{"zh": "…", "en": "…"}`。用户只要中文时改成 `["zh"]`,文字可以直接写字符串。

4. **校验**:`python3 tools/validate.py`。有 error 必须修;warning 逐条看,能修就修。

5. **打包**:`python3 tools/build.py` → `dist/pitch.html`(文件名来自 `meta.output`)。
   有 Node 和 Playwright 时再跑 `node tools/smoke.js dist/pitch.html`,它会逐章打开、截图到 `dist/shots/`,报告脚本错误和溢出;看一下截图。

6. **交给用户**:告诉用户文件路径,让他双击打开,按右下角 ▶ 自动播放。他提修改意见 → 回到第 3 步 → 再校验、再打包。

## 写作规则

- **数字必须有来源**:有数字的章节加一个 `source` 组件(来源 + 日期)。PPT 里没有来源的数字,问用户,不要编。
- **不编造**:只用 PPT 和用户给的材料。缺的信息在大纲阶段列出来问用户。
- **情景 ≠ 预测**:推算出来的量级标「情景,不是预测」。
- **状态分开**:已经做到的和计划中的分开写;组件里用 `status`(`live` 已上线 / `main` 主网 / `prev` 预览 / `todo` 待开发 / `plan` 规划)。
- **一章一张卡**:展示卡在对话里会按高度自动缩放,内容太多会变小字;一张卡最多 3–4 个组件,多了就拆章。
- **可选风格「圆形语言」**(中文读者常用):先讲「我们在哪个圈、离中心多远、是什么身份」,再讲具体场景。用 `rings` 组件画位置图,后面每章用同一张图换 `highlight`;功能写成 `scenes`(场景 · 谁 · 发生什么 · 我们的位置)。用户的 PPT 本来是「问题 → 方案」结构时,不要强行改。

## deck.json 结构

```json
{
  "meta":  {"title": {"zh": "", "en": ""}, "langs": ["zh", "en"], "defaultLang": "zh", "output": "pitch"},
  "brand": {"name": "", "agentName": {"zh": "", "en": ""}, "logo": "assets/logo.png", "accent": "#4f8cff", "accentDark": "#1f5fd6"},
  "chapters": [
    {"id": "open", "toc": {"zh": "开场", "en": "Opening"}, "tool": "可选:一行「工具调用」字样",
     "say": [{"zh": "", "en": ""}],
     "ask": [{"zh": "追问", "en": "Ask"}, {"zh": "数字哪来的?", "en": "Source?", "reply": {"zh": "", "en": ""}}],
     "blocks": [ … ]}
  ],
  "demo": {"label": {"zh": "产品", "en": "Product"},
           "scenes": [{"id": "home", "title": {"zh": "首页", "en": "Home"}, "desc": {"zh": "", "en": ""}, "image": "assets/s05-1.png", "addr": "app.example.com"}]}
}
```

- 文字字段都可以是字符串或 `{"zh","en"}`;可以含 `<b>` `<em>` `<br>`。
- `demo` 可选:有产品截图时放进来,顶部会出现「产品」页,左边列场景、右边浏览器框显示截图。场景可以是 `image`(截图)、`file`(本地 HTML,会打包进去)或 `url`(需要联网)。追问按钮 `{"zh": "看产品", "jump": true, "scene": "home"}` 可直接跳过去。
- `ask` 里 `{"goto": "章节id"}` 可跳到指定章节。

## 组件(blocks)

| type | 用途 | 字段 |
| --- | --- | --- |
| `title` | 每章大标题 | `eyebrow`(小字)、`h`(标题,`<em>` 高亮、`<br>` 换行)、`lede`(副标题) |
| `text` | 一段话 | `text` |
| `tiles` | 关键数字卡 | `items: [{label, value 或 count(数字,会滚动), prefix, suffix, note, hl, up}]` |
| `bars` | 横向对比条 | `items: [{label, value(数字), display(显示文字), hl}]` |
| `columns` | 按时间的柱图 | `items: [["10-20", 31454], …]`、`cumulative`(叠累计线)、`partialLast`(最后一根半透明)、`color` |
| `line` | 折线 | `series: [{name, color, points: [["Q1", 10], …]}]` |
| `donut` | 构成 / 占比 | `items: [{label, value, color}]`、`center: {value, label}` |
| `kline` | K 线 | `rows: [["日期", 开, 高, 低, 收, 量], …]` |
| `rings` | 同心圆位置图 | `rings`(外→内:`{label, sub, color}`,最多 3 层)、`center: {label, sub}`、`chips`(最多 4 个,四角)、`highlight`(0–3 或省略)、`flow`(四个 chip 顺时针箭头)、`legend: [{label, text, color}]` |
| `flow` | 步骤 | `steps: [{title, desc, hl}]`、`columns` |
| `cards` | 并列要点 / 风险 | `items: [{no, title, desc, foot, tone: risk/warn}]` |
| `scenes` | 场景卡 | `items: [{name, who, what, place, status}]`、`color` |
| `roadmap` | 阶段 / 路线图 | `phases: [{title, when, status, items: []}]` |
| `table` | 表格 | `columns: []`、`rows: [[…]]`;单元格写 `{"v": "…", "hl": true}` 可高亮 |
| `compare` | 以前 vs 现在 | `before / after: {label, title, items: []}` |
| `image` | 图片 | `src`(`assets/…`)、`caption` |
| `quote` | 引言 / 客户原话 | `text`、`by` |
| `grid` | 并排放 | `cols`、`blocks`(每个自动套一个面板) |
| `panel` | 带标题的面板 | `heading`、`note`、`blocks` |
| `source` | 来源行 | `text`、`date` |
| `html` | 兜底:任意 HTML | `html` |

PPT 内容 → 组件的常见对应:
- 大数字页 → `tiles`;柱状 / 折线图 → `columns` / `line`(数据从 `slides.md` 的 Chart 部分抄);饼图 → `donut`
- 时间轴 / 里程碑 → `roadmap`;流程图 → `flow`;对比页 → `compare` 或 `table`
- 产品截图 → `image`,或放进 `demo`;市场地图 / 生态位 → `rings`

## 常见问题

- 打开是空白:运行 `python3 tools/validate.py`,多半是 JSON 写错了(逗号、引号)。
- 图片不显示:路径要相对 `deck/`,例如 `assets/s03-1.png`,并且文件存在。
- 卡片字太小:这一章组件太多,拆成两章。
- 微信 / 飞书里打开有安全提示:那是 App 内置浏览器对本地或境外页面的提示,用系统浏览器打开即可。
