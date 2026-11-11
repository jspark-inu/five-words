#!/usr/bin/env python3
"""제목에 쓰는 글꼴(Black Han Sans)에서 화면 제목과 단어 34개의 글자만 뽑아 woff2로 만든다.

사용: python3 scripts/subset-font.py <BlackHanSans-Regular.ttf>
필요: fonttools, brotli (전역 설치 말고 venv에서 쓴다)
"""
import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "fonts" / "BlackHanSans-subset.woff2"

def used_text() -> str:
    chars: set[str] = set()
    for f in (ROOT / "src" / "ui").glob("*.ts"):
        chars.update(re.findall(r"[가-힣]", f.read_text(encoding="utf-8")))
    words = (ROOT / "src" / "content" / "words.ts").read_text(encoding="utf-8")
    for ko in re.findall(r"\bko: '([^']+)'", words):
        chars.update(ko)
    chars.update(chr(c) for c in range(0x20, 0x7F))  # 숫자·기본 문장부호
    chars.update("·…“”‘’—–")
    return "".join(sorted(chars))

def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    font = subset.load_font(sys.argv[1], opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=used_text())
    sub.subset(font)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUT), opts)
    print(f"{OUT} {OUT.stat().st_size} bytes")

if __name__ == "__main__":
    main()
