# Font matching when a language plan is missing

Reuse approved, evidence-backed plans for ordinary MG work. Read this only for
new font curation or a requested typography adaptation.

1. For Chinese, generate an attractive CHINESE effect image in the accepted
   style, or reuse one already generated in this workflow. Do not derive the
   target directly from English letterforms or constrain generation to a
   previously guessed font.
2. Search Google Fonts / Maoken for available fonts. Compare real specimens
   using the SAME Chinese words against that generated target. For English,
   compare real specimens against the English reference.
3. Record the target image, selected family, weight/italic/axes, source and
   remaining differences. Distinguish original vs approximate matches and
   candidate vs specimen-compared vs MG-rendered evidence. File availability
   or glyph coverage does not establish visual approval. An MG render is not
   required for specimen comparison.
4. Check coverage for the actual text and font availability in the rendering
   runtime. Store only the selected plan, with separate `zh-Hans` and `en`
   recommendations; preserve both for mixed-language work. Save families and
   usage roles in `designSpec.fonts`, language/weight/italic/axes in `styleGuide`.

Reopen matching only when the current text or requested style needs it; do not
repeat concept generation and font search for every MG or adopt a different
font merely because a cross-style form reference uses it.
