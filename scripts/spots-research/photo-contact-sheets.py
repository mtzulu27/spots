import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

directory = Path(sys.argv[1])
report = json.loads((directory / 'inventory.json').read_text())
out = directory / 'sheets'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15)
assets = report['assets']
for start in range(0, len(assets), 12):
    sheet = Image.new('RGB', (1440, 1160), '#e8e8e8')
    draw = ImageDraw.Draw(sheet)
    for offset, asset in enumerate(assets[start:start + 12]):
        x, y = (offset % 4) * 360, (offset // 4) * 386
        ref = asset['references'][0]
        label = f"{start + offset + 1:03} {ref['slug']} {ref['role']}"
        draw.text((x + 8, y + 8), label, font=font, fill='black')
        draw.text((x + 8, y + 29), asset['id'], font=font, fill='black')
        try:
            with Image.open(asset['file']) as original:
                image = ImageOps.exif_transpose(original).convert('RGB')
                asset['width'], asset['height'] = image.size
                image.thumbnail((344, 318))
                sheet.paste(image, (x + 8 + (344 - image.width)//2, y + 58 + (318 - image.height)//2))
        except Exception as error:
            if asset.get('file'):
                asset['status'] = 'unreadable'
            draw.text((x + 8, y + 110), asset.get('error', str(error))[:38], font=font, fill='red')
    sheet.save(out / f'sheet-{start//12+1:03}.jpg', quality=93)
(directory / 'inventory.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'sheets': (len(assets)+11)//12, 'assets': len(assets)}))
