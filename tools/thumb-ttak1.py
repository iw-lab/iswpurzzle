#!/usr/bin/env python3
"""딱 1 로켓 킹수학 썸네일 — 키아트(GPT 웹앱/Firefly 생성) 위에 한글 제목을 스크립트로 얹는다(AI 한글은 뭉개진다).

규격·안전지대(옛 크로마폴 썸네일 실측 교훈 그대로):
  · 업로드 400×267(1.50) · 메인 카드는 1.60 cover 크롭 · 관리 목록은 1:1 크롭 → **가운데 정사각이 안전지대**
  · 아래 22% 는 비운다 — 포털이 «제작 발주자 심선생» 배지를 얹는다
  python3 tools/thumb-ttak1.py  → dist-kingsmath/ttak1-thumb-1200.png · ttak1-thumb.webp(400×267 RGB) · ttak1-thumb-preview.png(크롭 3종)
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist-kingsmath')
W, H = 1200, 801
FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'


def find_keyart():
    for d in ('ff', 'gpt', ''):
        p = os.path.join(ROOT, 'game-assets-src', 'raw', d, 'keyart.png')
        if os.path.exists(p): return p
    raise SystemExit('❌ keyart.png 없음 — 이미지 생성(raw/ff) 먼저')


def font(size, index=16):
    # AppleSDGothicNeo.ttc 번호: 16 Heavy · 14 ExtraBold · 6 Bold · 8 은 Light(옛 크로마폴 썸네일이 8 을 써서 얇았다)
    for idx in (index, 14, 6, 0):
        try: return ImageFont.truetype(FONT, size, index=idx)
        except Exception: continue
    return ImageFont.load_default()


def outlined(d, xy, text, f, fill, stroke=(20, 12, 40), sw=10, anchor='mm'):
    d.text(xy, text, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke, anchor=anchor)


def main():
    os.makedirs(OUT, exist_ok=True)
    art = Image.open(find_keyart()).convert('RGB')
    sc = max(W / art.width, H / art.height)
    art = art.resize((round(art.width * sc), round(art.height * sc)), Image.LANCZOS)
    x0 = (art.width - W) // 2
    y0 = max(0, (art.height - H) // 2 + round(H * 0.06))
    y0 = min(y0, art.height - H)
    img = art.crop((x0, y0, x0 + W, y0 + H)).convert('RGBA')
    # 위쪽을 어둡게(제목 대비) · 아래 22% 도 살짝(배지 자리)
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(H):
        t = y / H
        a = int(170 * max(0, 1 - t / 0.5)) + (int(90 * (t - 0.78) / 0.22) if t > 0.78 else 0)
        sd.line([(0, y), (W, y)], fill=(8, 6, 30, min(200, a)))
    img = Image.alpha_composite(img, shade)
    d = ImageDraw.Draw(img)
    cx = W // 2
    # 제목: 딱 [1] 로켓 — 가운데 정사각(x 200~1000) 안
    f_big = font(170)
    f_one = font(230)
    parts = [('딱', f_big, (255, 255, 255)), ('1', f_one, (255, 207, 74)), ('로켓', f_big, (255, 255, 255))]
    gap = 26
    widths = [d.textbbox((0, 0), t, font=f, stroke_width=12)[2] for t, f, _ in parts]
    total = sum(widths) + gap * (len(parts) - 1)
    x = cx - total / 2
    ty = 215
    for (t, f, c), w in zip(parts, widths):
        outlined(d, (x + w / 2, ty), t, f, c, sw=12)
        x += w + gap
    # 부제: 식 한 줄 — 무엇을 하는 게임인지 3m 밖에서 읽히게
    f_sub = font(54, 14)
    sub = '1/4 + 0.5 + 25% = 1'
    bw = d.textbbox((0, 0), sub, font=f_sub)[2] + 64
    d.rounded_rectangle([cx - bw / 2, 352, cx + bw / 2, 440], radius=46, fill=(255, 207, 74, 235), outline=(40, 22, 0), width=5)
    d.text((cx, 396), sub, font=f_sub, fill=(43, 23, 0), anchor='mm')
    # 안전지대 단언 — 제목·부제가 가운데 정사각(x 200~1000) 안에 있어야 1:1 크롭에서 안 잘린다
    assert total <= 780 and bw <= 760, f'안전지대 밖: 제목 {total:.0f}px · 부제 {bw:.0f}px'
    rgb = img.convert('RGB')
    rgb.save(os.path.join(OUT, 'ttak1-thumb-1200.png'))
    small = rgb.resize((400, 267), Image.LANCZOS)
    small.save(os.path.join(OUT, 'ttak1-thumb.webp'), 'WEBP', quality=90, method=6)
    # 미리 보기: 원본 · 1.60 카드 크롭 · 1:1 크롭
    card_h = round(400 / 1.6)
    card = small.crop((0, (267 - card_h) // 2, 400, (267 - card_h) // 2 + card_h))
    sq = small.crop(((400 - 267) // 2, 0, (400 - 267) // 2 + 267, 267))
    prev = Image.new('RGB', (400 + 400 + 267 + 40, 267), (30, 30, 30))
    prev.paste(small, (0, 0)); prev.paste(card, (420, (267 - card_h) // 2)); prev.paste(sq, (840, 0))
    prev.save(os.path.join(OUT, 'ttak1-thumb-preview.png'))
    print('✅', os.path.join(OUT, 'ttak1-thumb.webp'), small.size, small.mode)


if __name__ == '__main__':
    main()
