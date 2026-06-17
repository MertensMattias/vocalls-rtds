#!/usr/bin/env python3
"""
Encode a JS source string for inclusion inside a Vocalls mxGraph XML attribute.

Rules (matching the shipped sendSms / sendMail / guardTui components, which all
use the NUMERIC single-quote entity &#39;, never &apos;):
  - Single quotes inside JS source -> &#39;
  - Double quotes -> &quot;
  - Newlines     -> &#xa;
  - <            -> &lt;
  - >            -> &gt;
  - &            -> &amp;

Usage:
    python encode_for_xml_attr.py < input.js > encoded.txt
or
    echo "log_debug('hello')" | python encode_for_xml_attr.py
"""

import sys


def encode_for_xml_attr(source: str) -> str:
    # Order matters: & first, then the others (so we don't re-encode &#39; etc.)
    out = source
    out = out.replace("&", "&amp;")
    out = out.replace("<", "&lt;")
    out = out.replace(">", "&gt;")
    out = out.replace('"', "&quot;")
    out = out.replace("'", "&#39;")
    out = out.replace("\n", "&#xa;")
    return out


def main() -> None:
    data = sys.stdin.read()
    sys.stdout.write(encode_for_xml_attr(data))


if __name__ == "__main__":
    main()
