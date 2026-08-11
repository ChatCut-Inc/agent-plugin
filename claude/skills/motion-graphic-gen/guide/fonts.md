# Fonts in Motion Graphics

## How fonts resolve at render time

Browser tries the font you write first; if not present, falls through to the
appended fallback stack (`Inter, Noto Sans, Noto Sans SC, Noto Sans TC, Noto
Sans JP, Noto Sans KR, ...`). This stack is appended automatically — do not
write it manually.

- **Local export / editor preview**: the user's OS fonts are available. Mac
  users have PingFang / PuHuiTi / Heiti etc. natively; Windows users have
  Microsoft YaHei; etc. The font the user asks for usually renders.
- **Cloud (Lambda) export**: only the fonts shipped with the render image
  are available — Google Fonts (declared in `fontFamily` and recognized by
  our font database get preloaded), bundled custom fonts listed below, and the
  Noto CJK family. Any font outside that set falls through to Noto in the
  stack. **Do not promise the user that an unbundled non-Google font will
  render in cloud export.**

## Rules

- Declare fonts with `fontFamily` only.
- Prefer bundled custom fonts when the user asks for stylized Chinese text and
  cloud export fidelity matters (Chinese name in parens — users often request
  these by their Chinese name; always write the Latin family as `fontFamily`):
  `Smiley Sans`（得意黑）, `HarmonyOS Sans`（鸿蒙黑体）, `Qingsong Shouxie Ti
Yi`（轻松手写体一）, `Qingsong Shouxie Ti San P`（轻松手写体三）, `Pangmen
Zhengdao Biaoti Ti`（庞门正道标题体）, `Pangmen Zhengdao Qingsong
Ti`（庞门正道轻松体）, `Huxiaobo Nanshen Ti`（胡晓波男神体）, `Huxiaobo Saobao
Ti`（胡晓波骚包体）, `Huxiaobo Zhenshuai Ti`（胡晓波真帅体）, `Douyin Meihao
Ti`（抖音美好体）, `OPPO Sans`, `Xinqingnian Ti`（新青年体）. If unsure a
  requested name maps to one of these, use the `search_fonts` tool — it now
  matches Chinese names too (e.g. searching `新青年` returns `Xinqingnian Ti`).
- You may use any font name the user requested — including Chinese designer
  fonts like `PingFang SC`, `Microsoft YaHei`, `Alibaba PuHuiTi`, `Source Han
Sans SC`, `ZCOOL GaoEndHei`, etc. The system no longer rejects them.
- Do not load fonts manually: no `<style>` / `<script>` / `@import` /
  `@font-face` inside MG code.

## Examples

Good — user asked for a Chinese designer font:

```jsx
const titleStyle = {
  fontFamily: "PingFang SC",
  fontWeight: 700,
};
```

Also fine — explicit stack with author's preference first:

```jsx
const titleStyle = {
  fontFamily: "Alibaba PuHuiTi, Noto Sans SC, sans-serif",
};
```

Do not do this — manual font loading is still blocked by validation:

```jsx
<style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
```

## What to tell the user

- If they ask for a system font (PingFang, YaHei, PuHuiTi, etc.) and they
  plan to **local export**: just use the font, it will render.
- If they ask for an unbundled non-Google font and they plan to **cloud
  export**: use the font, but warn that cloud render may fall back to Noto.
  Offer bundled custom fonts or Google Fonts CJK alternatives (`Noto Sans SC`,
  `Noto Serif SC`, `ZCOOL XiaoWei`, `Ma Shan Zheng`, etc.) if exact glyph
  match matters.
- Do not silently rewrite the user's chosen font without telling them.
