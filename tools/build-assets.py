#!/usr/bin/env python3
"""build-assets.py — 생성 원본(game-assets-src/raw) → 게임용 에셋(public/assets) + manifest.json(단일 진실원).

  python3 tools/build-assets.py          # 있는 원본만 가공 · 없으면 그 칸을 빼고 manifest 를 쓴다(빠진 칸은 이름을 찍는다)
  python3 tools/build-assets.py --strict # 하나라도 빠지면 rc 1 (배포 전)

컷아웃 = 스킬 cutout-flood.py(단색 배경 flood fill — rembg 금지). 배경은 판에 들어갈 때만 불러온다(첫 로드 예산).
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'game-assets-src', 'raw')
PUB = os.path.join(ROOT, 'public', 'assets')
PY = os.path.expanduser('~/.claude/venvs/vibes/bin/python')
CUT = os.path.expanduser('~/.claude/skills/game-builder/tools/cutout-flood.py')
ROCKETS = ['rocket_red', 'rocket_blue', 'rocket_green', 'rocket_purple', 'rocket_orange']
BGS = ['bg_earth', 'bg_moon', 'bg_mars']
strict = '--strict' in sys.argv


def raw(name):
    """원본은 엔진 줄별 폴더(raw/ff · raw/gpt)에 있다 — 원장(_engine.json)도 폴더마다"""
    for d in ('ff', 'gpt', ''):
        p = os.path.join(RAW, d, name)
        if os.path.exists(p): return p
    return os.path.join(RAW, name)

missing = []


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print((r.stdout + r.stderr)[-600:])
    return r.returncode


def webp(src, dst, max_w=None, max_h=None, q=82):
    im = Image.open(src)
    if max_w or max_h:
        sc = min((max_w or 1e9) / im.width, (max_h or 1e9) / im.height, 1)
        if sc < 1:
            im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'WEBP', quality=q, method=6)


man = {'rockets': [], 'backgrounds': {}, 'planets': []}
tmp = os.path.join(ROOT, 'game-assets-src', 'cut')
os.makedirs(tmp, exist_ok=True)

for r in ROCKETS:
    src = raw(f'{r}.png')
    if not os.path.exists(src):
        missing.append(src); continue
    out = os.path.join(tmp, f'{r}.png')
    if run([PY, CUT, '--spec', '320x600', '--pad', '0.03', f'{src}:{out}']) not in (0,):
        missing.append(f'{src} (컷아웃 실패)'); continue
    webp(out, os.path.join(PUB, 'rockets', f'{r}.webp'), max_h=480, q=88)
    man['rockets'].append(f'assets/rockets/{r}.webp')

for b in BGS:
    src = raw(f'{b}.png')
    if not os.path.exists(src):
        missing.append(src); continue
    webp(src, os.path.join(PUB, 'bg', f'{b}.webp'), max_w=1600, q=74)
    man['backgrounds'][b] = f'assets/bg/{b}.webp'

for i in (1, 2):
    src = raw(f'planets_{i}.png')
    if not os.path.exists(src):
        missing.append(src); continue
    out = os.path.join(tmp, f'planets_{i}.png')
    if run([PY, CUT, '--sheet', '2x2', f'{src}:{out}']) not in (0,):
        missing.append(f'{src} (시트 컷아웃 실패)'); continue
    for c in range(4):
        cell = os.path.join(tmp, f'planets_{i}-{c}.png')
        if not os.path.exists(cell):
            missing.append(cell); continue
        im = Image.open(cell)
        bb = im.getbbox()
        if bb: im = im.crop(bb)
        p = os.path.join(tmp, f'planet_{(i - 1) * 4 + c}.png')
        im.save(p)
        webp(p, os.path.join(PUB, 'planets', f'planet_{(i - 1) * 4 + c}.webp'), max_w=128, max_h=128, q=86)
        man['planets'].append(f'assets/planets/planet_{(i - 1) * 4 + c}.webp')

# 아이콘 = 빨간 로켓(정사각 · 어두운 바탕)
rk = os.path.join(tmp, 'rocket_red.png')
if os.path.exists(rk):
    im = Image.open(rk).convert('RGBA')
    bb = im.getbbox(); im = im.crop(bb)
    S = 256
    bg = Image.new('RGBA', (S, S), (22, 26, 72, 255))
    sc = (S * 0.84) / max(im.size)
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    bg.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    bg.convert('RGB').save(os.path.join(PUB, 'icon.png'))
    bg.resize((192, 192), Image.LANCZOS).convert('RGB').save(os.path.join(PUB, 'icon-192.png'))
else:
    missing.append('icon (rocket_red 컷아웃 필요)')

ka = raw('keyart.png')
if os.path.exists(ka):
    im = Image.open(ka).convert('RGB')
    im.thumbnail((1200, 630))
    im.save(os.path.join(PUB, 'og.png'), optimize=True)
else:
    missing.append(ka)

rig = os.path.join(PUB, 'rig', 'doki.png')
if os.path.exists(rig):
    man['doki'] = {'image': 'assets/rig/doki.png', 'atlas': 'assets/rig/doki.json'}
else:
    missing.append('doki 리그 아틀라스(tools/rig-characters.py)')

json.dump(man, open(os.path.join(PUB, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(f"manifest: 로켓 {len(man['rockets'])} · 배경 {len(man['backgrounds'])} · 행성 {len(man['planets'])} · 도키 {'있음' if 'doki' in man else '없음'}")
if missing:
    print('빠진 것:'); [print('  -', m) for m in missing]
    if strict: sys.exit(1)
