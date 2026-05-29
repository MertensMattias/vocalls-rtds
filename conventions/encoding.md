# mxGraph XML encoding

**Scope:** [Component] · **Answers:** *How do I encode JS inside an XML attribute? Which entities to use?*

JS source embedded as XML attributes uses these entities:

- `'` → `&apos;` (preferred). `&#39;` is also valid XML but breaks byte-diff consistency — **don't mix**.
- `"` → `&quot;`.
- `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`.
- Newlines → `&#xa;`.

Indent JS with 4 spaces inside the encoded attribute. Reference encoder: [encode_for_xml_attr.py](../.claude/skills/vocalls-component-builder/scripts/encode_for_xml_attr.py).

## Reflect on

- **[grep]** Is the component using `&apos;` everywhere, or mixing `&apos;` and `&#39;`?
- **[grep]** Are newlines `&#xa;`?
- **[grep]** Are quote / bracket / ampersand entities encoded correctly?
