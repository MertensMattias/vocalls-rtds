# Pattern: Composite — Script + Vocalls primitives in the same component

Use when the component needs to drive Vocalls Designer primitives (prompt
the caller, collect DTMF, run a `case` / `counter` switch, redirect, set
a variable in-line, pause) **between** the Script and the output node.

Composite is **not a Script-body pattern.** The Script node body itself
still comes from one of the other five pattern files
(`http_call.md`, `gui_exit.md`, `set_attributes.md`, `condition.md`,
`flow_jump.md`) and is emitted **unchanged**. Composite is purely about
what sits **between** the Script (id=29) and the output (id=6) in the
graph.

Per-Type attribute reference and edge-routing rules live in
[../node_types.md](../node_types.md). Read that file first.

## When to use

Pick `composite.md` when **all** of these are true:

1. The component genuinely needs an in-component prompt, DTMF/speech
   collection, `case`/`counter` evaluation, redirect, or in-line variable
   set — i.e. the Script alone can't fulfil the operator's intent.
2. The primitive flow is **terminal for this component** — every branch
   eventually reaches the output node (id=6). Composite does not loop
   back into the Script or the init node.
3. You have already chosen the Script-body pattern (one of the other five).
   Composite assumes that choice is fixed.

If the request is a pure routing-table operation (no engine-side prompts
or collects), do not use composite — use the matching pattern from the
table in [INDEX.md](INDEX.md).

## Skeleton — graph

The canonical 4-node skeleton stays intact:

| id  | label  | role                                     |
| --- | ------ | ---------------------------------------- |
| 0   | input  | unchanged                                |
| 7   | init   | unchanged                                |
| 29  | script | **body is verbatim from another pattern**|
| 6   | output | unchanged (single terminal sink)         |

Edges `28` (0→7) and `30` (7→29) stay. Edge `38` (29→6) is **replaced** by
a chain of edges that ends at id=6. The chain runs through one or more
primitives (and their child branches).

Primitive and child ids are **freely-allocated unique integers** — there
is no rigid "primitives ≥ 100, children ≥ 200" rule (an earlier convention
that does not match production components). The only numbering rules are:

- The canonical four ids `0` / `7` / `29` / `6` and canonical edges `28`
  (0→7) and `30` (7→29) never move.
- The new chain replacing edge `38` (29→…→6) and every primitive /
  child / edge use unique integers within the file.
- The chrome row's id is conventionally `parent_id + 1` (e.g. parent=102
  → chrome=103). The non-chrome children and downstream edges pick any
  free integers.

A common starting offset (`100` for primitives, `200` for children) is
fine for readability but not required. The wiring rules below are
load-bearing; the numbering is not.

See [../primitive_examples.md §10](../primitive_examples.md) for the
production-reference id-numbering observation.

```
   ┌────────────┐
   │ input  (0) │
   └─────┬──────┘
         │ edge 28
   ┌─────▼──────┐
   │ init   (7) │
   └─────┬──────┘
         │ edge 30
   ┌─────▼──────┐
   │ script(29) │  body unchanged from the chosen Script-body pattern
   └─────┬──────┘
         │ edge 100  (replaces the old 38)
   ┌─────▼────────┐
   │ primitive101 │  e.g. say
   └─────┬────────┘
         │ edge 101
   ┌─────▼────────┐
   │ primitive102 │  e.g. dtmf
   └────┬─┬─┬──┬──┘
        │ │ │  │   each child branch edges to output (id=6)
        ▼ ▼ ▼  ▼
   ┌──────────────┐
   │ output  (6)  │  OnEnter log fires once on the way out
   └──────────────┘
```

## Why this shape

- **The Script body is selected from the existing five patterns, then
  emitted unchanged.** The composite pattern is invariant to the choice
  of Script-body — it only changes the post-Script graph. This keeps every
  rule from the original patterns intact (HTTP error callback, `Active`
  guard, branch defaults, `walk` writes for GUI-exit Types, etc.).
- **Primitives are wired by explicit edges, not by JS.** The Vocalls
  engine dispatches them natively. Routing between primitives is pure
  graph topology — every non-chrome branch child gets an explicit
  `<mxCell edge="1">` sourced from its id. The Script never calls
  `__makeLocalNodeId` to point at a primitive and never returns a
  primitive id as an exit key.
- **The output node remains the single terminal sink.** Every primitive
  branch (directly or transitively) edges into id=6. This guarantees the
  output's `OnEnter` log fires exactly once per run, regardless of which
  primitive branch was taken. For `__rtOutcome`-staging Script bodies that
  output node also resolves the staged key once
  (`global[_rtNextStep] = getValue(__rtParams, __rtOutcome, '');
  Logger.info('[<componentName>] exit', { outcome: __rtOutcome, nextStep: global[_rtNextStep] });`).
  Every composite component is a self-contained v2 component on this
  contract — there is no exit-key-returning Script body (GUI-exit routing is
  the engine's job; see [gui_exit.md](gui_exit.md)).

## Edge contract — rules summary

These mirror [../node_types.md](../node_types.md) §"Universal rules";
read that file for the canonical statement.

0. **Anchor every composite edge on both ends.** The canonical edges
   `28` (0→7), `30` (7→29), and `38` (29→6, in non-composite Style A)
   are anchor-free by convention. Every edge added in composite mode
   (replacing `38`) must pin both `exit*` (source side) and `entry*`
   (target side) so the router does not auto-route into mid-edges. Use
   the three patterns in [../node_types.md §Universal rule 10](../node_types.md):
   - **Vertical trunk** — `exitX=0.5;exitY=1` → `entryX=0.5;entryY=0`.
   - **Rightward side branch** — `exitX=1;exitY=0.5` → `entryX=0;entryY=0.5`.
   - **Leftward side branch / loop-back** — `exitX=0;exitY=0.5` →
     `entryX=1;entryY=0.5` (or `entryX=0;entryY=0.5` for a loop-back
     into a node's left side).

   Mixed pairs (e.g. `0.5/0 → 1/0.5`) are fine when the geometry calls
   for them — pick the pair that visually matches the source/target
   positions. Default: vertical-trunk pair.
1. **Routing is by explicit `<mxCell edge="1">` from each child id —
   not by `DynamicNextId` alone.** On every branching Type, each
   non-chrome child carries `DynamicNextId=""` and is wired by an
   explicit edge:
   ```xml
   <mxCell id="<edge-id>"
           style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;..."
           parent="baselayer"
           source="<child-id>"
           target="<dest-id>"
           edge="1">
     <mxGeometry relative="1" as="geometry" />
   </mxCell>
   ```
   A child left with `DynamicNextId=""` **and** no incoming edge sourced
   from its id is a dangling branch — bug.
2. Edges source from **child ids** on `recognize`, `dtmf`, `case`,
   `counter`, `number`, `redirect`. Never from the parent id.
3. `*InnerNode` children (`recognizeInnerNode`, `dtmfInnerNode`, …) are
   visual chrome. They are **never** edge endpoints.
4. **Branching-Type children's `<mxCell>` use
   `parent="<parent-primitive-id>"`** (the parent primitive's own id),
   not `parent="baselayer"`. Only the **primitive's own `<mxCell>`**
   sits on `baselayer`. Edge cells always use `parent="baselayer"`
   regardless of where their endpoints sit.
5. Linear-flow Types (`say`, `setvar`, `pause`) have no children and
   edge from the parent's own id; their `<mxCell>` sits directly on
   `baselayer`.
6. Every primitive branch eventually reaches id=6.

## Variants

### Variant A — Linear prefix

The Script's outcome falls through one or more linear primitives (`say`,
`setvar`, `pause`) before reaching the output. Useful for "announce the
result before exiting".

```
script(29) ──► say(101) ──► output(6)
```

### Variant B — Branch fanout

The Script's outcome falls through a branching primitive whose children
each route to a different downstream node (often back to the output,
sometimes via another linear primitive).

```
                  ┌─► output(6)        # key "1"
script(29) ──► dtmf(101)
                  ├─► output(6)        # key "2"
                  └─► output(6)        # noInput
```

### Variant C — Branch with retry

A branching primitive's failure child (`notRecognized` / `noInput` /
`default`) routes **back through** an earlier primitive in the chain
(typically a `say` that re-prompts). All success branches still terminate
at id=6.

```
   ┌──────────────────────┐
   ▼                      │
script(29) ──► say(101) ──► dtmf(102)
                            │ │ │
                            ▼ ▼ ▼
                          output(6)   (per-key branches)
                            ▲
                            │ noInput branch back to say(101)
```

Retry loops must always be bounded — set `MaxEntryCount` on the looping
primitive and `MaxEntryNodeId` to id=6 so the loop is guaranteed to
terminate.

## Worked example — self-contained component with say + dtmf collect + recognize fallback

Composite mode applies to a **self-contained v2 component** that embeds
Designer primitives — e.g. the `guard_tui` target ([guardTui.js](../examples/)),
which collects a DTMF activate/deactivate choice. The Script body is an
ordinary [http_call.md](http_call.md)-style body that stages `__rtOutcome`;
it does **not** `walk` Params into `RTDS_OP_*` and does **not** `return` an
exit key (GUI-exit routing is the engine's job — see [gui_exit.md](gui_exit.md)):

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { outcome: 'NextStep' });
    return;
}

// ... validate inputs, pivot __rtOutcome = 'NextStep_Failure',
//     fire jsonHttpRequest(...).then(success, error), stage the chosen
//     'NextStep_*' key into __rtOutcome ...
```

`__rtOutcome` is resolved once at the output node (id=6) with the `''`
fallback, exactly as in every other v2 component. The primitives below sit
between id=29 and id=6 and are wired purely in XML; the per-key DTMF/recognize
branches route to the relevant says or back into the flow.

### Graph additions (XML excerpt)

```xml
<!-- say: re-prompt for menu choice -->
<object label="prompt"
        Type="say"
        Text="Press 1 for sales, 2 for support, or say it."
        SelectionMode="temporary"
        id="101">
  <mxCell style="sayNode" parent="baselayer" vertex="1">
    <mxGeometry x="600" y="-60" width="287" height="80" as="geometry" />
  </mxCell>
</object>

<!-- dtmf: per-key dispatch -->
<object Type="dtmf" Timeout="15000" id="102">
  <mxCell style="dtmfNode" parent="baselayer" vertex="1">
    <mxGeometry x="600" y="60" width="160" height="160" as="geometry" />
  </mxCell>
</object>
<object id="201"><mxCell style="dtmfInnerNode" parent="102" vertex="1">
  <mxGeometry x="10" y="16" width="140" height="40" as="geometry" /></mxCell></object>
<object label="1" SubType="choice" Key="1" DynamicNextId="" id="202">
  <mxCell style="choiceNode" parent="102" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" /></mxCell></object>
<object label="2" SubType="choice" Key="2" DynamicNextId="" id="203">
  <mxCell style="choiceNode" parent="102" vertex="1">
    <mxGeometry x="10" y="86" width="140" height="30" as="geometry" /></mxCell></object>
<object label="no input" SubType="noInput" DynamicNextId="" id="204">
  <mxCell style="noInputNode" parent="102" vertex="1">
    <mxGeometry x="10" y="116" width="140" height="30" as="geometry" /></mxCell></object>

<!-- recognize: speech fallback when dtmf saw nothing -->
<object Type="recognize"
        Timeout="15000" MinTimeout="8000"
        ExpectedSpeechType="default"
        SimilarityTreshold="0.4" NoiseDistance="0.05"
        NLPEngine="Embedding" id="103">
  <mxCell style="recognizeNode" parent="baselayer" vertex="1">
    <mxGeometry x="600" y="240" width="163" height="160" as="geometry" />
  </mxCell>
</object>
<object id="205"><mxCell style="recognizeInnerNode" parent="103" vertex="1">
  <mxGeometry x="10" y="16" width="143" height="40" as="geometry" /></mxCell></object>
<object label="sales" SubType="reactionGroup" Grammar="sales" Lemma="true"
        Priority="0.5" DynamicNextId="" id="206">
  <mxCell style="reactionGroupNode" parent="103" vertex="1">
    <mxGeometry x="10" y="56" width="143" height="30" as="geometry" /></mxCell></object>
<object label="support" SubType="reactionGroup" Grammar="support" Lemma="true"
        Priority="0.5" DynamicNextId="" id="207">
  <mxCell style="reactionGroupNode" parent="103" vertex="1">
    <mxGeometry x="10" y="86" width="143" height="30" as="geometry" /></mxCell></object>
<object label="no match" SubType="notRecognized" DynamicNextId="" id="208">
  <mxCell style="notRecognizedNode" parent="103" vertex="1">
    <mxGeometry x="10" y="116" width="143" height="30" as="geometry" /></mxCell></object>

<!-- edges (replacing canonical 38) -->
<!-- trunk hops (vertical-trunk anchor pair: bottom-centre → top-centre) -->
<mxCell id="100" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="29" target="101" edge="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
<mxCell id="104" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="101" target="102" edge="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- dtmf children: choices fall to output; noInput falls to recognize.
     All three use the vertical-trunk pair because recognize (id=103) is
     stacked directly below the dtmf in the same column (x=600). -->
<mxCell id="120" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="202" target="6" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="121" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="203" target="6" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="122" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="204" target="103" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>

<!-- recognize children: each reactionGroup + notRecognized falls to output
     (vertical-trunk pair when recognize sits above id=6, in the trunk column) -->
<mxCell id="130" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="206" target="6" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="131" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="207" target="6" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="132" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="208" target="6" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
```

Notice every edge added in composite mode pins both `exit*` and
`entry*` — the only edges that may omit `entry*` are the canonical
pre-Script pair (`28`, `30`). See [../node_types.md §Universal rule 10](../node_types.md).

**Every** non-chrome branch child of `dtmf` and `recognize` has an
explicit edge sourced from its id. Earlier versions of this document
said `DynamicNextId="<target>"` alone was sufficient — that produces
orphan branches in Designer (visually unconnected children). Always
emit the edge cell.

The `<mxCell>` of every dtmf / recognize child carries
`parent="<dtmf-or-recognize-id>"` (`102` or `103`), **not**
`parent="baselayer"`. Only the **primitive's own `<mxCell>`** and edge
cells sit on `baselayer`.

## Operation-specific helpers

None. The composite pattern adds **zero** master-`Code` helpers — its
contribution is entirely graph topology + primitive XML. If the
Script-body pattern you composed with (e.g. `condition.md`) needs an
inlined helper (`__compareAttr`), keep it as that pattern specifies.

## Don't hand-pick coordinates — run the layout pass

When the component has primitives between Script (id=29) and output
(id=6), don't try to compute their `<mxGeometry>` x/y values by hand.
Pick any values you like (even `(0, 0)` everywhere is fine) and then
run the layout script — it walks the trunk + branch topology and
rewrites every baselayer node's geometry so the graph renders cleanly
in Designer:

```bash
python scripts/layout_component.py <path-to-component.js>
```

Policy: trunk on x=317.5 (canonical column), 40px vertical gaps, branch
destinations placed in a right column next to the branching primitive
that points at them. Children inside branching primitives (chrome row,
choice rows, expression rows) use container-relative coords and are
left untouched — they only depend on row index. See SKILL.md Step 6b
and component-v2.md §1.

## Cross-reference

- Per-Type attribute reference: [../node_types.md](../node_types.md).
- Composite-mode pre-delivery items: [../checklist.md](../checklist.md)
  "Composite-mode additions" section.
- Composite shape and primitive wiring: [component-mxgraph.md](../../conventions/component-mxgraph.md).
- v2 four-node skeleton: [component-v2.md §1](../../conventions/component-v2.md).
