"""Make a smaller copy of a font under a new family name.

Used so Khmer text can render slightly smaller than the English font
next to it (editor settings only take one size for the whole font list).

Usage: python shrink-font.py <input.ttf> <output.ttf> "<New Family>" <scale>
Example scale: 13/14 = 0.9286 -> 1px smaller at 14px.
"""
import sys

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.ttProgram import Program

src, dst, family, scale = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])

font = TTFont(src)

# Glyphs are drawn relative to unitsPerEm, so a bigger em box makes every
# glyph, advance width and line metric smaller by the same ratio.
head = font["head"]
old_upm = head.unitsPerEm
head.unitsPerEm = round(old_upm / scale)

# Hinting programs are tuned for the original em size; drop them so the
# renderer does not distort the rescaled outlines.
for tag in ("fpgm", "prep", "cvt ", "hdmx", "LTSH", "VDMX"):
    if tag in font:
        del font[tag]
if "glyf" in font:
    for name in font.getGlyphOrder():
        glyph = font["glyf"][name]
        if hasattr(glyph, "program"):
            glyph.program = Program()
            glyph.program.fromBytecode(b"")
if "maxp" in font and hasattr(font["maxp"], "maxSizeOfInstructions"):
    font["maxp"].maxSizeOfInstructions = 0

names = font["name"]
names.removeNames(nameID=16)
names.removeNames(nameID=17)
for rec in list(names.names):
    if rec.nameID == 1:
        names.setName(family, 1, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 2:
        names.setName("Regular", 2, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 3:
        names.setName(family + " Regular", 3, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 4:
        names.setName(family, 4, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 6:
        names.setName(family.replace(" ", "") + "-Regular", 6, rec.platformID, rec.platEncID, rec.langID)

font.save(dst)
print(f"{dst}: unitsPerEm {old_upm} -> {head.unitsPerEm} (scale {scale:.4f})")
