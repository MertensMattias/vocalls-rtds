# TTS writing rules

Canonical reference for writing and reviewing text that will be **spoken
aloud** via TTS in a Vocalls IVR phone conversation. Applies to all
customer-facing content: action messages, openings, confirmation
messages, and any quoted phrases in `advancedInstructions` that the
LLM is instructed to speak.

Per-language register (formal/informal pronoun choice, section headers)
lives in [[register]]. Sentence-length and forbidden-phrase
rules live in [[ivr-objective-dsl-ruleset]] Part 3.4.

---

## Universal rules (all languages)

### Punctuation for TTS

| Pattern | Problem | Fix |
|---|---|---|
| Em dash `—` | TTS reads as pause or skips; both break flow | Replace with `.` |
| Ellipsis `...` | Reads as literal dots or unnatural pause | Replace with `.` or remove |
| Double punctuation `??` `!!` | Sounds robotic | Single `?` or `!` |
| Semicolon `;` | Engine-dependent; often mispronounced | Replace with `.` |

### Pronoun density

Never repeat the same second-person pronoun ≥ 3 times in one sentence or
across two consecutive short sentences. At ≥ 3 occurrences the TTS
rhythm becomes monotonous.

**Detection:** count `je|jij|jouw` (NL), `vous|votre|vos` (FR),
`Sie|Ihnen|Ihr` (DE) per sentence. Flag at ≥ 3.

**Fix:** replace excess instances with neutral passive, a demonstrative
(`dat`, `ce`, `das`, `that`), or restructure.

```
BAD (NL): "Er is een e-mail naar je verstuurd met een link naar je
           Klantenzone, waar je je attesten kunt downloaden. Je hoeft
           niet in de wachtrij te wachten."
           → 5× je

GOOD:     "Er is een e-mail verstuurd met een link naar je Klantenzone,
           waar de attesten gedownload kunnen worden. Wachten in de
           wachtrij is niet nodig."
           → 1× je
```

### Numbers and special characters

- **Phone numbers:** group in pairs: `04 78 12 34 56`. TTS reads groups,
  not digit strings.
- **Prices:** never `€150`. Write `150 euro` (NL/FR) / `150 Euro` (DE) /
  `150 euros` (EN).
- **Percentages:** never `%`. Write `procent` (NL) / `pour cent` (FR) /
  `Prozent` (DE) / `percent` (EN).
- **URLs:** never in TTS output. Redirect to email or visual channel.

### Brand and product names

- Use exactly one form throughout a message. Never mix translations of
  the same product name (`Klantenzone` vs `Klantruimte`) within a
  CONFIG.
- Product names are language-scoped. Never use the NL form in a FR or DE
  slot.
- All-caps brands (`ENGIE`, `ING`) are pronounced as words if
  pronounceable. Test per engine.

### Placeholder positioning

- Never start a sentence with `{{placeholder}}` — TTS engines may not
  capitalize the injected value.
- Never place two placeholders adjacent without intervening text.
  - Bad: `{{partnerName}} {{partnerPhone}}`
  - Good: `{{partnerName}}, bereikbaar op {{partnerPhone}}`

---

## NL — Nederlands

**Register:** informal `je / jouw` by default — see [[register]].

### Vocabulary — prefer spoken over bureaucratic

| Avoid | Prefer | Why |
|---|---|---|
| `contacteren` | `bellen` | Natural for phone actions |
| `verstrekken` | `geven`, `ophalen` | Less bureaucratic |
| `dienen te` | `moeten` | Simpler |
| `teneinde` | `om` | Formal / archaic |
| `U moet` | `Je kunt` | `moeten` is blunt; `kunnen` empowers the caller |

### Sentence starters to vary

| Use for | Starters |
|---|---|
| Informational | `Er is een e-mail verstuurd…`, `Via je Klantenzone…`, `De [noun] is beschikbaar…`, `Daarvoor kun je…` |
| Confirmation | `Begrepen.` `Prima.` `Duidelijk.` |
| Question | `Wil je…?` `Kan ik…?` `Gaat het om…?` |

---

## FR — Français

**Register:** always formal `vous / votre / vos`. Never `tu / ton / ta`.
See [[register]].

### Vocabulary

| Avoid | Prefer | Why |
|---|---|---|
| `annuler` (contracts) | `résilier` | Legally precise |
| `prendre contact avec` | `contacter` | Shorter |
| Formal legal phrasing | Plain phrasing | IVR register |

**Punctuation:** do NOT add a space before `?`, `!`, `:`. TTS handles FR
punctuation spacing automatically. Write `Voulez-vous continuer?`, not
`Voulez-vous continuer ?`.

### Sentence starters to vary

| Use for | Starters |
|---|---|
| Informational | `Un e-mail vous a été envoyé…`, `Vous pouvez…`, `L'attestation est disponible…` |
| Confirmation | `Compris.` `Très bien.` `D'accord.` |
| Question | `Souhaitez-vous…?` `S'agit-il de…?` |

---

## DE — Deutsch

**Register:** always formal `Sie / Ihnen / Ihr`. Never `du / dir / dein`.
See [[register]].

### Vocabulary

| Avoid | Prefer | Why |
|---|---|---|
| `Intervention` | `Einsatz` | `Intervention` is a loanword; `Einsatz` is natural DE |
| `kontaktieren` | `anrufen` | Shorter; natural for phone context |
| `diesbezüglich` | plain phrasing | Bureaucratic |

**Compound nouns:** if a compound is very long, hyphenate for TTS
clarity: `Heimwartungsvertrag` → `Heimwartungs-Vertrag`. Test per engine.

**Verb position:** German verb-final subordinate clauses can cause TTS
pacing issues. Put the main clause first.

- Avoid: `Wenn eine Aktion fehlschlägt, rufen Sie transfer_to_agent auf.`
- Prefer: `Bei einem Fehler: transfer_to_agent aufrufen.`

### Sentence starters to vary

| Use for | Starters |
|---|---|
| Informational | `Eine E-Mail wurde gesendet…`, `Den Einsatz können Sie…`, `Ihre Atteste sind verfügbar…` |
| Confirmation | `Verstanden.` `Alles klar.` `Gut.` |
| Question | `Möchten Sie…?` `Handelt es sich um…?` |

---

## EN — English

**Register:** no formal/informal distinction. Contractions (`don't`,
`I'm`, `can't`) sound more natural in TTS than full forms.

**Exception:** use full forms in failure/apology messages — `I was not
able to` sounds more empathetic than `I wasn't able to`.

### Vocabulary

| Avoid | Prefer | Why |
|---|---|---|
| `contact` (for phone) | `call` | More direct |
| `aforementioned`, `herewith` | plain phrasing | Bureaucratic |
| `You do not need to wait` | `No need to wait` | More direct |

### Sentence starters to vary

| Use for | Starters |
|---|---|
| Informational | `An email has been sent…`, `You can…`, `Your attestations are available…` |
| Confirmation | `Got it.` `Alright.` `Understood.` |
| Question | `Would you like…?` `Are you looking to…?` |
