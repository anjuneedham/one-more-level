"""Short-form video engine: cuts recorded runs into vertical shorts from a recipe.

A recipe is a list of items rendered in order:
  Clip(run, s, e, speed=1.0, caps=[...], sfx=[...])   source frames [s, e)
  Hold(run, frame, seconds, caps=[...], sfx=[...])     freeze one frame
  Flash()                                               white flash at this cut
Captions are Cap(name, at, dur, y) with times in seconds relative to the item.
The end card is appended automatically.
"""
import json
import math
import os
import subprocess
import wave
from dataclasses import dataclass, field

import imageio_ffmpeg
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
W, H = 1080, 1920
SR = 48000

# The game's own sound table (src/services/audio.ts).
SOUNDS = {
    'click': [(660, 0, 0.05, 'triangle', 0.18)],
    'start': [(520, 0, 0.08, 'triangle', 0.2), (780, 0.08, 0.1, 'triangle', 0.2)],
    'tick': [(880, 0, 0.035, 'square', 0.09)],
    'success': [(660, 0, 0.09, 'triangle', 0.22), (880, 0.07, 0.09, 'triangle', 0.22), (1170, 0.14, 0.16, 'triangle', 0.2)],
    'fail': [(320, 0, 0.13, 'sawtooth', 0.16), (190, 0.1, 0.22, 'sawtooth', 0.14)],
    'levelup': [(523, 0, 0.08, 'square', 0.15), (659, 0.07, 0.08, 'square', 0.15), (784, 0.14, 0.08, 'square', 0.15), (1046, 0.21, 0.2, 'square', 0.16)],
    'coin': [(988, 0, 0.05, 'square', 0.14), (1318, 0.05, 0.12, 'square', 0.14)],
    'whoosh': [(240, 0, 0.16, 'sine', 0.12)],
}


@dataclass
class Cap:
    name: str
    at: float = 0.0
    dur: float = 1.5
    y: int = 1545


@dataclass
class Clip:
    run: int
    s: int
    e: int
    speed: float = 1.0
    caps: list = field(default_factory=list)
    sfx: list = field(default_factory=list)  # (sound name, seconds into item)
    mute: bool = False


@dataclass
class Hold:
    run: int
    frame: int
    seconds: float
    caps: list = field(default_factory=list)
    sfx: list = field(default_factory=list)
    dim: float = 0.0


@dataclass
class Flash:
    pass


# ------------------------------------------------------------------ runs
_runs = {}


def run(seed):
    if seed not in _runs:
        d = os.path.join(HERE, f'frames{seed}')
        meta = json.load(open(os.path.join(d, 'meta.json')))
        frames = meta['frames']
        last_img = max(i for i in range(len(frames)) if os.path.exists(os.path.join(d, f'f{i:05d}.jpg')))
        _runs[seed] = {'dir': d, 'frames': frames, 'sfx': meta['sfx'], 'last': last_img}
    return _runs[seed]


def kind_of(f):
    if f['screen'] == 'gameover':
        return 'over'
    if f['screen'] != 'game':
        return 'home'
    return f['cardKind'] or 'play'


def phases(seed):
    """[(kind, s, e, level, lives, instruction)] with e exclusive."""
    out = []
    for f in run(seed)['frames']:
        k = kind_of(f)
        if out and out[-1][0] == k and out[-1][3] == f['level']:
            out[-1][2] = f['i'] + 1
            if k == 'play' and not out[-1][5]:
                out[-1][5] = f['instruction']
        else:
            out.append([k, f['i'], f['i'] + 1, f['level'], f['lives'], f['instruction']])
    last = run(seed)['last']
    return [tuple(p[:2]) + (min(p[2], last + 1),) + tuple(p[3:]) for p in out if p[1] <= last]


def find(seed, kind, contains=None, level=None, nth=0, lives=None):
    hits = [p for p in phases(seed) if p[0] == kind
            and (contains is None or contains.lower() in (p[5] or '').lower())
            and (level is None or p[3] == level)
            and (lives is None or p[4] == lives)]
    return hits[nth]


def after(seed, p, kind):
    """First phase of `kind` starting at or after phase p ends."""
    return next(q for q in phases(seed) if q[1] >= p[2] and q[0] == kind)


# ------------------------------------------------------------------ helpers
def ease_out_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def fade(img, alpha):
    if alpha >= 1:
        return img
    im = img.copy()
    im.putalpha(img.getchannel('A').point(lambda v: int(v * max(0.0, alpha))))
    return im


_img_cache = {}


def pill(name, pills_dir):
    key = (pills_dir, name)
    if key not in _img_cache:
        im = Image.open(os.path.join(pills_dir, f'{name}.png')).convert('RGBA')
        if im.width > W - 16:
            im = im.resize((W - 16, round(im.height * (W - 16) / im.width)), Image.LANCZOS)
        _img_cache[key] = im
    return _img_cache[key]


def paste_caption(base, img, age, left, instant):
    appear = 1.0 if instant else min(1.0, age / 5)
    vanish = min(1.0, left / 4)
    s = 0.82 + 0.18 * ease_out_back(appear) if appear < 1 else 1.0
    alpha = min(appear * 1.4, vanish, 1.0)
    w, h = int(img.width * s), int(img.height * s)
    im = img.resize((w, h), Image.LANCZOS) if s != 1.0 else img
    return fade(im, alpha), w, h


def bbox_crop(img):
    box = img.getbbox()
    return img.crop(box), box


class EndCard:
    def __init__(self):
        d = os.path.join(HERE, 'cards')
        self.L = {n: Image.open(os.path.join(d, f'{n}.png')).convert('RGBA')
                  for n in ('end_bg', 'end_mark', 'end_word', 'end_tag', 'end_cta')}
        self.mark, self.mark_box = bbox_crop(self.L['end_mark'])
        self.cta, self.cta_box = bbox_crop(self.L['end_cta'])

    def frame(self, j, prev):
        c = prev.copy() if prev is not None else Image.new('RGBA', (W, H), (11, 14, 26, 255))
        c.alpha_composite(fade(self.L['end_bg'], j / 6))
        if j >= 2:
            x = min(1.0, (j - 2) / 10)
            s = max(0.05, ease_out_back(x))
            w, h = int(self.mark.width * s), int(self.mark.height * s)
            cx, cy = (self.mark_box[0] + self.mark_box[2]) / 2, (self.mark_box[1] + self.mark_box[3]) / 2
            c.alpha_composite(fade(self.mark.resize((w, h), Image.LANCZOS), x * 2), (int(cx - w / 2), int(cy - h / 2)))
        if j >= 7:
            x = min(1.0, (j - 7) / 9)
            layer = Image.new('RGBA', (W, H))
            layer.alpha_composite(fade(self.L['end_word'], x), (0, int((1 - x) ** 3 * 60)))
            c.alpha_composite(layer)
        if j >= 14:
            c.alpha_composite(fade(self.L['end_tag'], (j - 14) / 7))
        if j >= 19:
            x = min(1.0, (j - 19) / 8)
            pulse = 1 + 0.025 * math.sin((j - 27) / FPS * 2 * math.pi * 1.3) if j > 27 else 1
            s = max(0.05, ease_out_back(x)) * pulse
            w, h = int(self.cta.width * s), int(self.cta.height * s)
            cx, cy = (self.cta_box[0] + self.cta_box[2]) / 2, (self.cta_box[1] + self.cta_box[3]) / 2
            c.alpha_composite(fade(self.cta.resize((w, h), Image.LANCZOS), x * 2), (int(cx - w / 2), int(cy - h / 2)))
        return c


# ------------------------------------------------------------------ audio
def osc(kind, freq, n):
    t = np.arange(n) / SR
    ph = (freq * t) % 1.0
    if kind == 'sine':
        return np.sin(2 * np.pi * freq * t)
    if kind == 'triangle':
        return 4 * np.abs(ph - 0.5) - 1
    if kind == 'square':
        return np.tanh(np.sin(2 * np.pi * freq * t) * 4)
    return 2 * ph - 1


def tone(kind, freq, dur, peak):
    n = int((dur + 0.02) * SR)
    t = np.arange(n) / SR
    env = np.where(t < 0.012, 0.0001 * (peak / 0.0001) ** (t / 0.012),
                   peak * (0.0001 / peak) ** np.clip((t - 0.012) / max(1e-4, dur - 0.012), 0, 1))
    return osc(kind, freq, n) * env * 0.7


def logged_tone(ev):
    steps = ev['gain']
    a = next((x[2] for x in steps if x[0] == 'set'), ev['start'])
    exps = [x for x in steps if x[0] == 'exp']
    peak = exps[0][1] if exps else 0.2
    end_t = exps[1][2] if len(exps) > 1 else ev['stop']
    return tone(ev['type'], ev['freq'], max(0.02, end_t - a), peak), a


def add_at(buf, wave_, at):
    i0 = int(at * SR)
    if i0 < 0 or i0 >= len(buf):
        return
    n = min(len(wave_), len(buf) - i0)
    buf[i0:i0 + n] += wave_[:n]


def play_named(buf, name, at, gain=1.0):
    for f, off, d, k, g in SOUNDS[name]:
        add_at(buf, tone(k, f, d, g) * gain, at + off)


PROGS = [
    [(110.0, [220.0, 261.63, 329.63]), (87.31, [174.61, 220.0, 261.63]), (130.81, [261.63, 329.63, 392.0]), (98.0, [196.0, 246.94, 293.66])],
    [(98.0, [196.0, 246.94, 293.66]), (130.81, [261.63, 329.63, 392.0]), (110.0, [220.0, 261.63, 329.63]), (87.31, [174.61, 220.0, 261.63])],
    [(73.42, [293.66, 349.23, 440.0]), (116.54, [233.08, 293.66, 349.23]), (87.31, [349.23, 440.0, 523.25]), (130.81, [261.63, 329.63, 392.0])],
    [(82.41, [329.63, 392.0, 493.88]), (130.81, [261.63, 329.63, 392.0]), (98.0, [392.0, 493.88, 587.33]), (146.83, [293.66, 369.99, 440.0])],
]


def music(dur, bpm=124, prog=0, seed=7, arp_oct=2, swing=0.0):
    beat = 60 / bpm
    n = int(SR * dur) + SR
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    P = PROGS[prog % len(PROGS)]
    for b in range(int(dur / beat) + 1):
        t0 = b * beat
        root, chord = P[(b // 4) % 4]
        kt = np.arange(int(0.18 * SR)) / SR
        f = 45 + 95 * np.exp(-kt * 28)
        add_at(out, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-kt * 16) * 0.5, t0)
        hn = int(0.05 * SR)
        hat = rng.standard_normal(hn) * np.exp(-np.arange(hn) / SR * 90) * 0.09
        add_at(out, np.diff(np.concatenate([[0], hat])), t0 + beat * (0.5 + swing))
        if b % 4 in (1, 3):
            sn = int(0.12 * SR)
            snare = rng.standard_normal(sn) * np.exp(-np.arange(sn) / SR * 30) * 0.08
            add_at(out, snare, t0)
        for k in range(2):
            bt = np.arange(int(beat / 2 * SR * 0.9)) / SR
            add_at(out, np.tanh(np.sin(2 * np.pi * root * bt) * 2.5) * np.exp(-bt * 5) * 0.2, t0 + k * beat / 2)
        for k in range(4):
            at = np.arange(int(beat / 4 * SR * 0.85)) / SR
            fa = chord[(b * 4 + k) % 3] * arp_oct
            ph = (fa * at) % 1.0
            add_at(out, (4 * np.abs(ph - 0.5) - 1) * np.exp(-at * 14) * 0.065, t0 + k * beat / 4)
    return out


# ------------------------------------------------------------------ render
def render(items, out_path, pills_dir, end_sec=2.4, music_opts=None, work_dir=None):
    work_dir = work_dir or os.path.dirname(os.path.abspath(out_path))
    # 1. Expand items into an output frame list.
    frames = []   # (seed, src_frame, dim)
    caps = []     # (img, t0, t1, y, instant)
    cues = []     # (sound, out_seconds)
    tone_maps = []  # (seed, src_ms_start, src_ms_end, out_start_s, speed)
    flashes = []
    for it in items:
        start = len(frames)
        if isinstance(it, Flash):
            flashes.append(start)
            continue
        if isinstance(it, Clip):
            R = run(it.run)
            e = min(it.e, R['last'] + 1)
            n_out = max(1, round((e - it.s) / it.speed))
            for k in range(n_out):
                frames.append((it.run, min(e - 1, it.s + int(k * it.speed)), 0.0))
            if not it.mute:
                t = {f['i']: f['t'] for f in R['frames']}
                tone_maps.append((it.run, t[it.s], t[e - 1] + 1000 / FPS, start / FPS, it.speed))
        elif isinstance(it, Hold):
            n_out = round(it.seconds * FPS)
            frames.extend([(it.run, it.frame, it.dim)] * n_out)
        for c in it.caps:
            t0 = start + round(c.at * FPS)
            caps.append((pill(c.name, pills_dir), t0, t0 + round(c.dur * FPS), c.y, t0 == 0))
        for name, at in it.sfx:
            cues.append((name, start / FPS + at))
    game_len = len(frames)
    end_len = round(end_sec * FPS)
    total = game_len + end_len
    dur = total / FPS

    # 2. Audio.
    sfx_buf = np.zeros(int(SR * dur) + SR)
    for seed, ms0, ms1, out0, speed in tone_maps:
        for ev in run(seed)['sfx']:
            ms = ev['start'] * 1000
            if ms0 <= ms < ms1:
                w_, _ = logged_tone(ev)
                add_at(sfx_buf, w_, out0 + (ms - ms0) / 1000 / speed)
    for name, at in cues:
        play_named(sfx_buf, name, at)
    play_named(sfx_buf, 'levelup', game_len / FPS + 0.08)
    for f0 in flashes:
        play_named(sfx_buf, 'whoosh', f0 / FPS - 0.05, 1.6)
    mo = dict(music_opts or {})
    m = music(dur, **mo)
    n = int(SR * dur)
    env = np.ones(n)
    env[: int(0.2 * SR)] = np.linspace(0, 1, int(0.2 * SR))
    env[-int(0.7 * SR):] = np.linspace(1, 0, int(0.7 * SR))
    mix = np.tanh((sfx_buf[:n] * 1.15 + m[:n] * 0.42 * env) * 1.1) * 0.9
    pcm = (mix * 32767).astype(np.int16)
    wav_path = os.path.join(work_dir, os.path.basename(out_path) + '.wav')
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(np.stack([pcm, pcm], axis=1).tobytes())

    # 3. Video.
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.Popen([
        ff, '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-i', wav_path,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
        '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out_path,
    ], stdin=subprocess.PIPE)
    end = EndCard()
    white = Image.new('RGBA', (W, H), (242, 245, 255, 255))
    black = Image.new('RGBA', (W, H), (11, 14, 26, 255))
    last = None
    cache = {}
    for k in range(total):
        if k < game_len:
            seed, src, dim = frames[k]
            key = (seed, src)
            if key not in cache:
                cache.clear()
                img = Image.open(os.path.join(run(seed)['dir'], f'f{src:05d}.jpg')).convert('RGBA')
                if img.size != (W, H):
                    img = img.resize((W, H), Image.LANCZOS)
                cache[key] = img
            img = cache[key].copy()
            if dim:
                img = Image.blend(img, black, dim)
            for pim, t0, t1, y, instant in caps:
                if t0 <= k < t1:
                    im, w, h = paste_caption(img, pim, k - t0, t1 - k, instant)
                    img.alpha_composite(im, (int(W / 2 - w / 2), int(y - h / 2)))
            for f0 in flashes:
                if f0 - 3 <= k < f0 + 4:
                    img = Image.blend(img, white, 0.55 * (1 - abs(k - f0) / 4))
            last = img
        else:
            img = end.frame(k - game_len, last)
        proc.stdin.write(img.convert('RGB').tobytes())
    proc.stdin.close()
    proc.wait()
    os.remove(wav_path)
    return dur
