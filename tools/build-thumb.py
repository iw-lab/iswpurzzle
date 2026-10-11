#!/usr/bin/env python3
"""크로마폴 킹수학 등재 썸네일 — 결정론 생성(PIL).

🔴 썸네일은 "업로드 규격"이 아니라 **표시 비율**에 맞춰 디자인한다.
   킹수학은 400×267(1.50)을 받지만
     · 메인 카드  = cover 로 **1.60** 크롭 (위아래가 잘린다)
     · 관리 목록  = **1:1** 크롭 (좌우 33%가 통째로 날아간다)
   → **중앙 정사각이 안전지대.** 제목과 핵심 비주얼은 전부 그 안에 넣는다.

   2026-08-31 실측: 이전 썸네일은 제목을 맨 왼쪽에 뒀다가 1:1 크롭에서
   「크로마폴」이 「로마폴」로, 「CHROMAFALL」이 「MAFALL」로 잘렸다.
   그래서 구도를 중앙 정렬로 새로 짰다.

🔴 하단 22% 는 비워 둔다 — 포털 카드가 「제작 발주자 심선생」 배지를 그 위에 얹는다.
🔴 한글은 스크립트가 그린다. AI 가 그린 한글은 이 크기에서 반드시 뭉개진다.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

from PIL import ImageFont

W, H = 1200, 801                       # 3× of 400×267
SAFE = H                               # 중앙 정사각 한 변
SX0 = (W - SAFE) / 2                   # 199.5
CX = W / 2

BG_TOP = (17, 20, 40)
BG_BOT = (44, 22, 62)
INK = (245, 247, 255)
CYAN = (86, 226, 236)
MAGENTA = (236, 62, 122)
MAGENTA_HI = (255, 106, 158)
DIM = (150, 158, 190)

FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
OUT_PNG = os.path.join(os.path.dirname(__file__), '..', 'dist-kingsmath', 'thumb.png')
OUT_WEBP = os.path.join(os.path.dirname(__file__), '..', 'dist-kingsmath', 'thumb.webp')
OUT_PREV = os.path.join(os.path.dirname(__file__), '..', 'dist-kingsmath', 'thumb-preview.png')


def font(size, index=8):
    for idx in (index, 8, 7, 6, 0):
        try:
            return ImageFont.truetype(FONT, size, index=idx)
        except Exception:
            continue
    return ImageFont.load_default()


def ctext(d, cx, cy, text, f, fill, track=0):
    """중앙 정렬. track>0 이면 자간을 벌린다(영문 로고용)."""
    if track:
        widths = [d.textlength(ch, font=f) for ch in text]
        total = sum(widths) + track * (len(text) - 1)
        x = cx - total / 2
        l, t, r, b = d.textbbox((0, 0), text, font=f)
        y = cy - (b - t) / 2 - t
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=f, fill=fill)
            x += w + track
        return total
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text((cx - (r - l) / 2 - l, cy - (b - t) / 2 - t), text, font=f, fill=fill)
    return r - l


def rrect(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def main():
    S = 2                                        # 슈퍼샘플링
    img = Image.new('RGB', (W * S, H * S), BG_TOP)
    d = ImageDraw.Draw(img)

    # ── 배경 그라데이션(세로)
    for y in range(H * S):
        t = y / (H * S)
        d.line([(0, y), (W * S, y)],
               fill=tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOT)))

    # ── 퍼즐 우물: 세로 컬럼 격자 (전폭 — 어느 크롭에서도 비지 않게)
    col = 100 * S
    for x in range(0, W * S, col):
        d.line([(x, 0), (x, H * S)], fill=(255, 255, 255, 0) if False else (38, 44, 78), width=2)

    # ── 바깥 블리드(좌우)에 떨어지는 블록 — 1:1 크롭에서는 안 보여도 되는 장식
    def falling(bx, by, c, size=62, trail=150, alpha=1.0):
        # 낙하 궤적 — 위로 흐릿하게 늘어지는 꼬리. 「떨어지는 퍼즐」을 한눈에.
        for k in range(10):
            t = k / 10
            yy = by - trail * t
            fade = (1 - t) * 0.30 * alpha
            d.rounded_rectangle(
                [(bx + 6) * S, yy * S, (bx + size - 6) * S, (yy + size * 0.5) * S],
                radius=10 * S,
                fill=tuple(int(BG_TOP[i] + (c[i] - BG_TOP[i]) * fade) for i in range(3)))
        d.rounded_rectangle([bx * S, by * S, (bx + size) * S, (by + size) * S], 14 * S,
                            fill=tuple(int(v * .45 * alpha) for v in c),
                            outline=tuple(int(v * alpha) for v in c), width=3 * S)

    # 바깥 블리드(좌우) — 1:1 크롭에서 안 보여도 되는 장식
    for bx, by, c in [(62, 150, (86, 226, 236)), (52, 400, (255, 196, 84)),
                      (78, 640, (140, 122, 255)), (1056, 210, (255, 196, 84)),
                      (1084, 470, (86, 226, 236)), (1046, 690, (109, 226, 150))]:
        falling(bx, by, c)
    # 안전지대 안쪽 — **타일 줄 양옆에만** 둔다. 1:1 크롭에서도 낙하감이 남아야 하지만
    # 글자 밴드(제목 y100~350)와 겹치면 회색 덩어리로 보인다(2026-08-31 검수에서 잡힘).
    for bx, by, c in [(206, 430, (86, 226, 236)), (940, 452, (109, 226, 150))]:
        falling(bx, by, c, size=46, trail=120)

    # ══ 여기부터 중앙 정사각 안전지대 ══
    # 제목
    ctext(d, CX * S, 148 * S, '크로마폴', font(132 * S), INK)
    ctext(d, CX * S, 246 * S, 'CHROMAFALL', font(40 * S, 6), CYAN, track=14 * S)

    # 한 줄 카피 (200px 미리보기에서 읽히는 최소 크기)
    ctext(d, CX * S, 330 * S, '표기가 달라도 값이 같으면 터진다', font(52 * S), INK)

    # ── 핵심 비주얼: 같은 값 4개가 나란히 붙어 터진다
    tiles = ['1/2', '2/4', '0.5', '50%']
    tw, th, gap = 150, 112, 18
    total = len(tiles) * tw + (len(tiles) - 1) * gap
    x = CX - total / 2
    cy = 470

    # 터짐 글로우 (별도 레이어 → 블러)
    glow = Image.new('RGB', (W * S, H * S), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle([(x - 26) * S, (cy - th / 2 - 26) * S,
                          (x + total + 26) * S, (cy + th / 2 + 26) * S],
                         radius=40 * S, fill=(150, 30, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(30 * S))
    img = Image.blend(img, Image.blend(img, glow, 0.0), 0.0) if False else \
        Image.fromarray(__import__('numpy').clip(
            __import__('numpy').asarray(img).astype(int) +
            __import__('numpy').asarray(glow).astype(int), 0, 255).astype('uint8'))
    d = ImageDraw.Draw(img)

    for i, t in enumerate(tiles):
        bx = x + i * (tw + gap)
        rrect(d, [bx * S, (cy - th / 2) * S, (bx + tw) * S, (cy + th / 2) * S],
              22 * S, fill=MAGENTA, outline=MAGENTA_HI, width=3 * S)
        ctext(d, (bx + tw / 2) * S, cy * S, t, font(56 * S), INK)

    # 라벨
    ctext(d, CX * S, 566 * S, '같은 값이면 색이 달라도 한 덩어리', font(38 * S, 6), CYAN)

    # 대상 — 하단 22%(y>625) 위에 둔다
    # 🔴 200px 미리보기가 진짜 표시 크기다. 31px 는 그 축소에서 뭉개졌다 → 40px + 짧게.
    ctext(d, CX * S, 620 * S, '5~6학년 · 가입 없이 바로', font(40 * S, 6), DIM)

    img = img.resize((W, H), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(OUT_PNG)), exist_ok=True)
    img.save(OUT_PNG)
    img.resize((400, 267), Image.LANCZOS).save(OUT_WEBP, 'WEBP', quality=90, method=6)
    img.resize((200, 134), Image.LANCZOS).save(OUT_PREV)
    print('wrote', OUT_PNG, OUT_WEBP, OUT_PREV)


if __name__ == '__main__':
    main()
