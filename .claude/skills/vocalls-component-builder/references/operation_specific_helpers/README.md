# Operation-specific helpers

When an operation needs a helper beyond the five canonical ones, place it in master `Code` after the canonical block, before the work function. Examples below.

Every helper carries a JSDoc block. This is mandatory for every function the skill emits, including operation-specific helpers — no exceptions for "trivial" or "self-explanatory" signatures.

## SendSMS — `__isMobileNumber`

Phone number validation. Strips formatting, converts `00`-prefixed to `+`, validates against E.164 and national regexes.

```js
/**
 * Validates that a string is a plausible mobile phone number. Normalises by
 * stripping spaces/dashes/parens/dots and rewriting a leading '00' as '+'.
 * Accepts both E.164 international form and bare national form (7-15 digits).
 *
 * @param {string} phone - Raw user-supplied phone number.
 * @returns {boolean} True if the normalised number matches one of the patterns.
 */
__isMobileNumber = function (phone) {
    if (phone == null || phone === '') { return false; }

    var normalized = String(phone).replace(/[\s\-().]/g, '');
    if (normalized.indexOf('00') === 0) {
        normalized = '+' + normalized.slice(2);
    }

    var intl = /^\+[1-9]\d{6,14}$/;
    var national = /^[1-9]\d{6,14}$/;

    return intl.test(normalized) || national.test(normalized);
};
```

## Condition / CheckAttribute — `__compareAttr`

Operator-aware comparison. Handles `eq`, `ne`, `gt`, `lt`, `ge`, `le`. String comparison for `eq`/`ne`; numeric coercion for inequalities.

```js
/**
 * Compares two values using a string operator code. Equality operators use
 * string comparison; ordering operators coerce both sides to Number. Logs a
 * warning and returns false for unknown operators.
 *
 * @param {*} lhs - Left-hand-side value (typically the resolved attribute).
 * @param {string} op - Operator code: 'eq', 'ne', 'gt', 'lt', 'ge', or 'le'.
 * @param {*} rhs - Right-hand-side value (typically the configured target).
 * @returns {boolean} True if the comparison holds.
 */
__compareAttr = function (lhs, op, rhs) {
    if (op === 'eq') { return String(lhs) === String(rhs); }
    if (op === 'ne') { return String(lhs) !== String(rhs); }
    var ln = Number(lhs), rn = Number(rhs);
    if (op === 'gt') { return ln > rn; }
    if (op === 'lt') { return ln < rn; }
    if (op === 'ge') { return ln >= rn; }
    if (op === 'le') { re