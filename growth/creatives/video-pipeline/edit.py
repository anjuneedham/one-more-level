"""Cuts a captured run into a 30s vertical ad with captions, end card and audio.

usage: python3 edit.py frames_dir out.mp4
"""
import json
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image

import imageio_ffmpeg

FPS = 30
W, H = 1080, 1920
TOTAL = 30 * FPS
END_LEN = int(4.6 * FPS)
OVER_HOLD = int(2.4 * FPS)
CARDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cards') + '/'

src_dir, out_path = sys.argv[1], sys.argv[2]
meta = json.load(open(f'{src_dir}/meta.json'))
frames = meta['frames']
sfx = meta['sfx']


# ---------------------------------------------------------------- timeline
def phase_of(f):
    if f['screen'] == 'gameover':
        return 'over'
    if f['screen'] != 'game':
        return 'home'
    return f['cardKind'] or 'play'


phases = []  # [kind, start, end_exclusive, level, lives]
for f in frames:
    k = phase_of(f)
    if phases and phases[-1][0] == k:
        phases[-1][2] = f['i'] + 1
    else:
        phases.append([k, f['i'], f['i'] + 1, f['level'], f['lives']])

game = [p for p in phases if p[0] not in ('home', 'over')]
over = next((p for p in phases if p[0] == 'over'), None)
import os
while over and not os.path.exists(f"{src_dir}/f{over[2]-1:05d}.jpg"):
    over[2] -= 1
if not game or not over:
    sys.exit('run has no gameplay or no game over')

CAPS = {'intro': 14, 'success': 12, 'fail': 22, 'card': 12}
HOOK_LEN = int(2.5 * FPS)

# Cold open: the longest last-life moment that is not the final death.
last_life = [p for p in game if p[0] == 'play' and p[4] == 1 and p[2] - p[1] >= 40]
hook_phase = max(last_life, key=lambda p: p[2] - p[1]) if last_life else max(
    (p for p in game if p[0] == 'play'), key=lambda p: p[2] - p[1])
hook_seg = (hook_phase[1], hook_phase[1] + min(HOOK_LEN, hook_phase[2] - hook_phase[1] - 10))


def clip(p, play_cap):
    kind, s, e = p[0], p[1], p[2]
    cap = play_cap if kind == 'play' else CAPS.get(kind, 12)
    if e - s <= cap:
        return [(s, e)]
    if kind == 'play':
        head = cap // 3
        return [(s, s + head), (e - (cap - head), e)]
    return [(s, s + cap)]


hook_len = hook_seg[1] - hook_seg[0]
budget = TOTAL - END_LEN - OVER_HOLD - hook_len
play_cap = 150
while True:
    body = [c for p in game for c in clip(p, play_cap)]
    used = sum(e - s for s, e in body)
    if used <= budget or play_cap <= 24:
        break
    play_cap -= 2
segs = [hook_seg] + body
segs.append((over[1], min(over[2], over[1] + OVER_HOLD + max(0, budget - used))))
scale = play_cap
timeline = []  # output frame -> source frame index
for s, e in segs:
    timeline.extend(range(s, e))
# The game-over screen is static once its count-up finishes; hold it to fill.
while len(timeline) < TOTAL - END_LEN:
    timeline.append(timeline[-1])
game_len = len(timeline)
print(f'hook {hook_len}f from src {hook_seg}, play cap {play_cap}, body {used}f, total game {game_len}f, end {TOTAL - game_len}f')

over_out = timeline.index(over[1], hook_len)
level_at = [frames[i]['level'] for i in timeline]
lives_at = [frames[i]['lives'] for i in timeline]
kind_at = [phase_of(frames[i]) for i in timeline]


# ---------------------------------------------------------------- captions
def load(name):
    return Image.open(f'{CARDS}{name}.png').convert('RGBA')


captions = []  # (name, start, end, y_center)


def add(name, t0, t1, y=1545):
    captions.append((name, int(t0), int(t1), y))


add('hook', 0, 1.35 * FPS, 1520)
add('hook2', 1.35 * FPS, hook_len, 1520)


def free_at(t0, length):
    return all(t0 + length + 4 <= c[1] or t0 >= c[2] + 4 for c in captions)


t = hook_len + 0.35 * FPS
add('c_minis', t, t + 2.2 * FPS)
t += 2.6 * FPS
add('c_verbs', t, t + 2.4 * FPS)
harder = next((k for k, lv in enumerate(level_at) if k > t + 2.6 * FPS and lv >= 5), None)
if harder is not None and harder + 2.2 * FPS < over_out - 2 * FPS:
    add('c_harder', harder, harder + 2.2 * FPS)
life = next((k for k in range(hook_len, len(lives_at)) if lives_at[k] == 1 and kind_at[k] == 'play'), None)
if life is not None:
    start = life
    if not free_at(start, int(1.8 * FPS)):
        start = max(c[2] for c in captions) + 4
    if start + 1.2 * FPS < over_out:
        add('c_life', start, min(start + 1.8 * FPS, over_out - 2))
add('c_close', over_out + 3, over_out + 1.1 * FPS, 1790)
add('c_again', over_out + 1.1 * FPS, game_len, 1790)

cap_img = {name: load(name) for name, *_ in captions}


def ease_out_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def paste_caption(base, name, k, t0, t1, y):
    img = cap_img[name]
    age, left = k - t0, t1 - k
    appear = 1.0 if t0 == 0 else min(1.0, age / 5)
    vanish = min(1.0, left / 4)
    s = 0.82 + 0.18 * ease_out_back(appear) if appear < 1 else 1.0
    alpha = min(appear * 1.4, vanish, 1.0)
    w, h = int(img.width * s), int(img.height * s)
    im = img.resize((w, h), Image.LANCZOS) if s != 1.0 else img
    if alpha < 1:
        a = im.getchannel('A').point(lambda v: int(v * alpha))
        im = im.copy()
        im.putalpha(a)
    base.alpha_composite(im, (int(W / 2 - w / 2), int(y - h / 2)))


# ---------------------------------------------------------------- end card
end = {n: load(n) for n in ('end_bg', 'end_mark', 'end_word', 'end_tag', 'end_cta')}


def bbox_crop(img):
    box = img.getbbox()
    return img.crop(box), box


mark_img, mark_box = bbox_crop(end['end_mark'])
cta_img, cta_box = bbox_crop(end['end_cta'])


def fade(img, alpha):
    if alpha >= 1:
        return img
    im = img.copy()
    im.putalpha(img.getchannel('A').point(lambda v: int(v * max(0.0, alpha))))
    return im


def end_frame(j, prev):
    canvas = prev.copy() if prev is not None else Image.new('RGBA', (W, H), (11, 14, 26, 255))
    canvas.alpha_composite(fade(end['end_bg'], j / 7))
    # Icon pops in.
    if j >= 3:
        x = min(1.0, (j - 3) / 11)
        s = max(0.05, ease_out_back(x))
        w, h = int(mark_img.width * s), int(mark_img.height * s)
        cx = (mark_box[0] + mark_box[2]) / 2
        cy = (mark_box[1] + mark_box[3]) / 2
        canvas.alpha_composite(fade(mark_img.resize((w, h), Image.LANCZOS), x * 2), (int(cx - w / 2), int(cy - h / 2)))
    if j >= 9:
        x = min(1.0, (j - 9) / 10)
        dy = int((1 - (1 - (1 - x) ** 3)) * 60)
        layer = Image.new('RGBA', (W, H))
        layer.alpha_composite(fade(end['end_word'], x), (0, dy))
        canvas.alpha_composite(layer)
    if j >= 18:
        canvas.alpha_composite(fade(end['end_tag'], (j - 18) / 8))
    if j >= 25:
        x = min(1.0, (j - 25) / 9)
        pulse = 1 + 0.025 * math.sin((j - 34) / FPS * 2 * math.pi * 1.3) if j > 34 else 1
        s = max(0.05, ease_out_back(x)) * pulse
        w, h = int(cta_img.width * s), int(cta_img.height * s)
        cx = (cta_box[0] + cta_box[2]) / 2
        cy = (cta_box[1] + cta_box[3]) / 2
        canvas.alpha_composite(fade(cta_img.resize((w, h), Image.LANCZOS), x * 2), (int(cx - w / 2), int(cy - h / 2)))
    return canvas


# ---------------------------------------------------------------- audio
SR = 48000
dur_s = TOTAL / FPS
mix_sfx = np.zeros(int(SR * dur_s) + SR)
t_of = {f['i']: f['t'] for f in frames}


def osc(kind, freq, n):
    t = np.arange(n) / SR
    ph = (freq * t) % 1.0
    if kind == 'sine':
        return np.sin(2 * np.pi * freq * t)
    if kind == 'triangle':
        return 4 * np.abs(ph - 0.5) - 1
    if kind == 'square':
        # Soften the edges a little so it is not harsh on phone speakers.
        return np.tanh(np.sin(2 * np.pi * freq * t) * 4)
    return 2 * ph - 1  # sawtooth


def render_tone(ev):
    steps = ev['gain']
    a = next((x[2] for x in steps if x[0] == 'set'), ev['start'])
    exps = [x for x in steps if x[0] == 'exp']
    peak_v, peak_t = (exps[0][1], exps[0][2]) if exps else (0.2, a + 0.012)
    end_t = exps[1][2] if len(exps) > 1 else ev['stop']
    n = max(1, int((ev['stop'] - a) * SR))
    t = np.arange(n) / SR + a
    env = np.empty(n)
    att = t < peak_t
    env[att] = 0.0001 * (peak_v / 0.0001) ** ((t[att] - a) / max(1e-4, peak_t - a))
    rel = ~att
    env[rel] = peak_v * (0.0001 / peak_v) ** np.clip((t[rel] - peak_t) / max(1e-4, end_t - peak_t), 0, 1)
    return osc(ev['type'], ev['freq'], n) * env * 0.7, a


# Map each included source segment onto output time.
out_cursor = 0
for s, e in segs:
    ts, te = t_of[s], t_of[e - 1] + 1000 / FPS
    for ev in sfx:
        ms = ev['start'] * 1000
        if ts <= ms < te:
            wave_, a = render_tone(ev)
            at = out_cursor / FPS + (ms - ts) / 1000
            i0 = int(at * SR)
            mix_sfx[i0:i0 + len(wave_)] += wave_[: max(0, len(mix_sfx) - i0)]
    out_cursor += e - s

w_, _ = render_tone({'type': 'sine', 'freq': 240, 'start': 0, 'stop': 0.18,
                     'gain': [['set', 0.0001, 0], ['exp', 0.12, 0.012], ['exp', 0.0001, 0.16]]})
i0 = int(hook_len / FPS * SR) - int(0.05 * SR)
mix_sfx[i0:i0 + len(w_)] += w_ * 1.6

# The game's own level-up jingle as the end card lands.
LEVELUP = [(523, 0, 0.08), (659, 0.07, 0.08), (784, 0.14, 0.08), (1046, 0.21, 0.2)]
end_at = game_len / FPS + 0.1
for f_, at, d in LEVELUP:
    w_, _ = render_tone({'type': 'square', 'freq': f_, 'start': 0, 'stop': d + 0.02,
                         'gain': [['set', 0.0001, at], ['exp', 0.16, at + 0.012], ['exp', 0.0001, at + d]]})
    i0 = int((end_at + at) * SR)
    mix_sfx[i0:i0 + len(w_)] += w_


def music():
    bpm = 124
    beat = 60 / bpm
    n = int(SR * dur_s) + SR
    out = np.zeros(n)
    rng = np.random.default_rng(7)
    notes = {'A2': 110.0, 'F2': 87.31, 'C3': 130.81, 'G2': 98.0}
    prog = [('A2', [220.0, 261.63, 329.63]), ('F2', [174.61, 220.0, 261.63]),
            ('C3', [261.63, 329.63, 392.0]), ('G2', [196.0, 246.94, 293.66])]
    total_beats = int(dur_s / beat) + 1
    for b in range(total_beats):
        t0 = b * beat
        i0 = int(t0 * SR)
        bar = (b // 4) % 4
        root, chord = prog[bar]
        # Kick
        kn = int(0.18 * SR)
        kt = np.arange(kn) / SR
        f = 45 + 95 * np.exp(-kt * 28)
        kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-kt * 16) * 0.55
        out[i0:i0 + kn] += kick[: len(out) - i0]
        # Hats on the off-beats
        for off in (0.5,):
            h0 = int((t0 + off * beat) * SR)
            hn = int(0.05 * SR)
            hat = rng.standard_normal(hn) * np.exp(-np.arange(hn) / SR * 90) * 0.09
            hat = np.diff(np.concatenate([[0], hat]))
            out[h0:h0 + hn] += hat[: max(0, len(out) - h0)]
        # Bass: root on 8ths
        for k in range(2):
            b0 = int((t0 + k * beat / 2) * SR)
            bn = int(beat / 2 * SR * 0.9)
            bt = np.arange(bn) / SR
            fb = notes[root]
            tone = np.tanh(np.sin(2 * np.pi * fb * bt) * 2.5) * np.exp(-bt * 5) * 0.22
            out[b0:b0 + bn] += tone[: max(0, len(out) - b0)]
        # Arp: triangle 16ths through the chord, an octave up
        for k in range(4):
            a0 = int((t0 + k * beat / 4) * SR)
            an = int(beat / 4 * SR * 0.85)
            at = np.arange(an) / SR
            fa = chord[(b * 4 + k) % 3] * 2
            ph = (fa * at) % 1.0
            tri = (4 * np.abs(ph - 0.5) - 1) * np.exp(-at * 14) * 0.07
            out[a0:a0 + an] += tri[: max(0, len(out) - a0)]
    return out


mix_music = music()
n = int(SR * dur_s)
env = np.ones(n)
intro = int(0.25 * SR)
env[:intro] = np.linspace(0, 1, intro)
fo = int(0.9 * SR)
env[-fo:] = np.linspace(1, 0, fo)
mix = mix_sfx[:n] * 1.15 + mix_music[:n] * 0.42 * env
mix = np.tanh(mix * 1.1) * 0.9
pcm = (mix * 32767).astype(np.int16)
stereo = np.stack([pcm, pcm], axis=1)
with wave.open(f'{src_dir}/audio.wav', 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(stereo.tobytes())
print('audio written')

# ---------------------------------------------------------------- render
ff = imageio_ffmpeg.get_ffmpeg_exe()
proc = subprocess.Popen([
    ff, '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-i', f'{src_dir}/audio.wav',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out_path,
], stdin=subprocess.PIPE)

last_game = None
for k in range(TOTAL):
    if k < game_len:
        src = timeline[k]
        img = Image.open(f"{src_dir}/f{src:05d}.jpg").convert('RGBA')
        if img.size != (W, H):
            img = img.resize((W, H), Image.LANCZOS)
        for name, t0, t1, y in captions:
            if t0 <= k < t1:
                paste_caption(img, name, k, t0, t1, y)
        flash = hook_len - 3 <= k < hook_len + 4
        if flash:
            x = 1 - abs(k - hook_len) / 4
            img = Image.blend(img, Image.new('RGBA', (W, H), (242, 245, 255, 255)), 0.55 * x)
        last_game = img
    else:
        img = end_frame(k - game_len, last_game)
    proc.stdin.write(img.convert('RGB').tobytes())
proc.stdin.close()
proc.wait()
print('wrote', out_path, 'captions:', [(c[0], round(c[1] / FPS, 1), round(c[2] / FPS, 1)) for c in captions])
