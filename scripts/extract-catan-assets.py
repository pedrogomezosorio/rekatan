#!/usr/bin/env python3
"""Extract the supplied 28-page Catan print sheet without resampling its artwork.

Usage:
  python3 -m pip install -r scripts/requirements-assets.txt
  python3 scripts/extract-catan-assets.py /path/to/252848213-Cartas-de-Colonos-de-Catan-para-imprimir.pdf

This PDF contains cards, NOT terrain tiles or number chits. Existing terrain PNGs
are validated and retained. Number chits are explicitly labelled recreations in
the manifest; they are rendered locally, never attributed to the source PDF.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import random
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops, ImageDraw, ImageFont


SOURCE_SHA256 = "2a6ecd780d5454dd19966532f6eb5d47486715a9be802fc890661c6695fa4a7f"
ROOT = Path(__file__).resolve().parents[1]
TERRAINS = ("forest", "hills", "pasture", "fields", "mountains", "desert")
PIPS = {2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 0, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1}

# Page numbers are one-based; row/column indices are zero-based. Most embedded
# sheets are 758 x 909 pixels with a 5 x 4 grid. Page 12 has a different layout.
RESOURCE_CELLS = {
    "brick": (1, 0, 0), "wood": (1, 0, 1), "sheep": (1, 0, 2),
    "wheat": (1, 0, 3), "ore": (1, 0, 4),
    "paper": (17, 0, 0), "coin": (17, 1, 2), "cloth": (17, 2, 4),
}
VP_CELLS = {"vp_library": 0, "vp_market": 1, "vp_university": 2, "vp_town_hall": 3, "vp_church": 4}
PROGRESS_CELLS = {
    "resource_monopoly": (21, 0, 0), "merchant": (21, 0, 1),
    "commodity_monopoly": (21, 0, 4), "commercial_harbor": (21, 1, 0),
    "merchant_fleet": (21, 1, 1), "master_merchant": (21, 2, 1),
    "printer": (22, 0, 0), "mining": (22, 0, 1), "medicine": (22, 0, 2),
    "crane": (22, 0, 3), "alchemist": (22, 1, 0), "inventor": (22, 1, 1),
    "smith": (22, 1, 4), "irrigation": (22, 2, 0),
    "road_building": (22, 2, 3), "engineer": (22, 2, 4),
    "intrigue": (23, 0, 0), "deserter": (23, 0, 1), "saboteur": (23, 0, 2),
    "wedding": (23, 0, 3), "spy": (23, 0, 4), "warlord": (23, 1, 0),
    "bishop": (23, 1, 3), "diplomat": (23, 1, 4), "constitution": (23, 2, 4),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def card_alpha(image: Image.Image, shape: str) -> Image.Image:
    """Remove print gutters and mask corners, without deleting white artwork."""
    image = image.convert("RGB")
    if shape == "back":
        # The backs have white print gutters, unlike the edge-to-edge faces.
        difference = ImageChops.difference(image, Image.new("RGB", image.size, "white"))
        bounds = difference.convert("L").point(lambda p: 255 if p > 28 else 0).getbbox()
        if bounds is None:
            raise ValueError("Empty crop: no artwork found")
        image = image.crop(bounds)
    width, height = image.size
    scale = 4
    mask = Image.new("L", (width * scale, height * scale))
    draw = ImageDraw.Draw(mask)
    w, h = mask.size
    if shape == "back":
        draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=width * 0.035 * scale, fill=255)
    elif shape == "face":
        cut = round(width * 0.095 * scale)
        draw.polygon([(cut, 0), (w - cut - 1, 0), (w - 1, cut),
                      (w - 1, h - cut - 1), (w - cut - 1, h - 1),
                      (cut, h - 1), (0, h - cut - 1), (0, cut)], fill=255)
    else:
        draw.rectangle((0, 0, w - 1, h - 1), fill=255)
    result = image.convert("RGBA")
    result.putalpha(mask.resize((width, height), Image.Resampling.LANCZOS))
    return result


def token_font(explicit: Path | None) -> Path:
    candidates = [explicit] if explicit else [
        Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf"),
        Path("/Library/Fonts/Georgia Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
        Path("C:/Windows/Fonts/georgiab.ttf"),
    ]
    for path in candidates:
        if path and path.is_file():
            return path
    raise FileNotFoundError("Pass --font /path/to/a/bold-serif.ttf to recreate number chits")


def recreate_token(number: int, font_path: Path) -> Image.Image:
    """Local PNG replacement for the former SVG disc; NOT extracted artwork."""
    size, scale = 160, 4
    width = size * scale
    center, radius = (width - 1) / 2, width / 2 - 5 * scale
    image = Image.new("RGBA", (width, width))
    pixels = image.load()
    rng = random.Random(1975 + number)
    for y in range(width):
        for x in range(width):
            distance = math.hypot(x - center, y - center) / radius
            if distance <= 1:
                shade = distance ** 3 * 24 + rng.uniform(-2, 2)
                pixels[x, y] = (round(247 - shade), round(231 - shade), round(187 - shade), 255)
    draw = ImageDraw.Draw(image)
    red = number in (6, 8)
    ink = "#aa2422" if red else "#30231c"
    bounds = (center - radius, center - radius, center + radius, center + radius)
    draw.ellipse(bounds, outline="#8c6d3f", width=2 * scale)
    inset = 6 * scale
    draw.ellipse(tuple(v + inset if i < 2 else v - inset for i, v in enumerate(bounds)),
                 outline="#c8aa72", width=scale)
    font = ImageFont.truetype(str(font_path), (76 if number < 10 else 67) * scale)
    text = str(number)
    box = draw.textbbox((0, 0), text, font=font)
    text_width, text_height = box[2] - box[0], box[3] - box[1]
    draw.text((center - text_width / 2 - box[0], 64 * scale - text_height / 2 - box[1]),
              text, font=font, fill=ink)
    count = PIPS[number]
    for i in range(count):
        px, py, r = center + (i - (count - 1) / 2) * 15 * scale, 118 * scale, 3.5 * scale
        draw.ellipse((px - r, py - r, px + r, py + r), fill=ink)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "public/assets")
    parser.add_argument("--font", type=Path, help="Bold serif TTF for recreated number chits")
    parser.add_argument("--preview", type=Path, help="Optional contact sheet for visual verification")
    args = parser.parse_args()
    source_hash = sha256(args.pdf)
    if source_hash != SOURCE_SHA256:
        parser.error("This crop map is for the supplied PDF (SHA-256 differs). Inspect the new PDF first.")
    doc = pymupdf.open(args.pdf)
    if len(doc) != 28:
        raise ValueError("Expected the complete 28-page document")
    sheets: dict[int, Image.Image] = {}
    entries: list[dict] = []
    previews: list[tuple[str, Image.Image]] = []

    def sheet(page: int) -> Image.Image:
        if page not in sheets:
            embedded = doc[page - 1].get_images(full=True)
            if len(embedded) != 1:
                raise ValueError(f"Page {page}: expected exactly one embedded sheet")
            data = doc.extract_image(embedded[0][0])
            sheets[page] = Image.open(io.BytesIO(data["image"])).convert("RGB")
        return sheets[page]

    def save(path: str, image: Image.Image, provenance: dict) -> None:
        output = args.output / path
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, format="PNG", optimize=True)
        entries.append({"path": path, "width": image.width, "height": image.height,
                        "sha256": sha256(output), **provenance})
        previews.append((path, image))

    def crop(path: str, page: int, box: tuple[int, int, int, int], shape: str = "face") -> None:
        source = sheet(page)
        if not (0 <= box[0] < box[2] <= source.width and 0 <= box[1] < box[3] <= source.height):
            raise ValueError(f"Invalid crop {path}: {box}")
        save(path, card_alpha(source.crop(box), shape),
             {"origin": "pdf", "page": page, "sheet_size": list(source.size), "crop": list(box)})

    def cell(path: str, page: int, row: int, column: int, shape: str = "face") -> None:
        source = sheet(page)
        if source.size != (758, 909):
            raise ValueError(f"Unexpected grid on page {page}: {source.size}")
        crop(path, page, (round(column * 758 / 5), round(row * 909 / 4),
                         round((column + 1) * 758 / 5), round((row + 1) * 909 / 4)), shape)

    for name, coordinates in RESOURCE_CELLS.items():
        cell(f"resources/{name}.png", *coordinates)
    cell("resources/back.png", 6, 0, 0, "back")
    cell("devcards/knight.png", 11, 1, 0)
    for name, column in VP_CELLS.items():
        cell(f"devcards/{name}.png", 11, 0, column)
    cell("devcards/victory_point.png", 11, 0, 0)
    for name, column in {"year_of_plenty": 0, "monopoly": 1, "road_building": 2}.items():
        crop(f"devcards/{name}.png", 12, (round(column * 455 / 3), 0, round((column + 1) * 455 / 3), 227))
    cell("devcards/back.png", 13, 0, 0, "back")
    crop("devcards/longest_road.png", 12, (469, 0, 744, 342), "rectangle")
    crop("devcards/largest_army.png", 12, (469, 343, 744, 683), "rectangle")
    for name, coordinates in PROGRESS_CELLS.items():
        cell(f"cities-knights/progress/{name}.png", *coordinates)
    for branch, page in {"trade": 24, "science": 25, "politics": 26}.items():
        cell(f"cities-knights/progress/{branch}_back.png", page, 0, 0, "back")

    font = token_font(args.font)
    for number in range(2, 13):
        save(f"tokens/{number}.png", recreate_token(number, font),
             {"origin": "recreated", "method": "Pillow parchment disc, serif number and probability pips",
              "font": font.name, "font_sha256": sha256(font), "pips": PIPS[number]})

    # No terrain imagery exists in this PDF. Never crop a card and call it a tile.
    # Keep the existing transparent hexagons without altering their silhouettes.
    for name in TERRAINS:
        path = args.output / f"terrains/{name}.png"
        if path.is_file():
            with Image.open(path) as image:
                if image.mode != "RGBA" or image.getchannel("A").getextrema() != (0, 255):
                    raise ValueError(f"Expected transparent terrain silhouette: {path}")
                entries.append({"path": f"terrains/{name}.png", "origin": "existing-repository",
                                "width": image.width, "height": image.height, "sha256": sha256(path)})

    manifest = {
        "source": {"filename": args.pdf.name, "sha256": source_hash, "pages": len(doc)},
        "notes": ["Card artwork is extracted at its native resolution, never upscaled.",
                  "The supplied PDF contains no terrain hexagons or number chits.",
                  "Terrain PNGs are existing repository assets. Numeric tokens are local recreations.",
                  "7.png is included for completeness; seven does not produce resources in the game."],
        "assets": entries,
    }
    (args.output / "catan-assets-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if args.preview:
        columns, cell_width, cell_height = 8, 165, 270
        contact = Image.new("RGB", (columns * cell_width, math.ceil(len(previews) / columns) * cell_height), "#29313a")
        draw = ImageDraw.Draw(contact)
        for i, (name, image) in enumerate(previews):
            image = image.copy()
            image.thumbnail((150, 226), Image.Resampling.LANCZOS)
            x, y = (i % columns) * cell_width, (i // columns) * cell_height
            contact.paste(image, (x + (cell_width - image.width) // 2, y + 4), image)
            draw.text((x + 3, y + 235), name.split("/")[-1], fill="white")
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        contact.save(args.preview)
    doc.close()
    print(f"Extracted {sum(e['origin'] == 'pdf' for e in entries)} card PNGs; recreated 11 tokens; validated {sum(e['origin'] == 'existing-repository' for e in entries)} existing terrains.")
    print(f"Manifest: {args.output / 'catan-assets-manifest.json'}")


if __name__ == "__main__":
    main()
