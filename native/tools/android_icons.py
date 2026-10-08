"""Androidプロジェクトのランチャーアイコンを、リポジトリのアイコン画像に差し替える。"""
import os, re
from PIL import Image  # GitHub Actions の ubuntu-latest には Pillow が入っている

here = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(here, '..', '..', 'icon-512.png')).convert('RGBA')
res = os.path.join(here, '..', 'android', 'app', 'src', 'main', 'res')
legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, px in legacy.items():
    folder = os.path.join(res, 'mipmap-' + d)
    if not os.path.isdir(folder):
        continue
    img = src.resize((px, px), Image.LANCZOS)
    for name in ('ic_launcher.png', 'ic_launcher_round.png'):
        img.save(os.path.join(folder, name))
    # Android 8以上は「背景（単色）＋前景」の方式。前景は108dpの枠の中央に約66%の大きさで置く
    canvas = round(px * 108 / 48)
    inner = round(canvas * 0.66)
    fg = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    fg.paste(src.resize((inner, inner), Image.LANCZOS), ((canvas - inner) // 2, (canvas - inner) // 2))
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

bg = os.path.join(res, 'values', 'ic_launcher_background.xml')
if os.path.exists(bg):
    t = open(bg, encoding='utf-8').read()
    t = re.sub(r'(<color name="ic_launcher_background">)[^<]*(</color>)', r'\g<1>#06331F\g<2>', t)
    open(bg, 'w', encoding='utf-8').write(t)
print('アイコンを差し替えました')
