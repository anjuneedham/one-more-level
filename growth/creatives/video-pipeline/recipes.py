"""The 10 shorts. Frame numbers index the recorded runs (frames<seed>/)."""
from shorts import Cap, Clip, Flash, Hold

LOW = 1790   # below tiles / answer grids / game-over buttons
MID = 1545   # lower third over open gameplay and result cards
TICKS = [('tick', 0.15), ('tick', 0.75), ('tick', 1.35)]


def ticks(n, gap=0.6, start=0.15):
    return [('tick', start + k * gap) for k in range(n)]


RECIPES = {}

# 1. RAGE: the whole of run 80, three lives gone by level 2.
RECIPES['01-lost-on-level-2'] = dict(music=dict(bpm=132, prog=2, seed=1), items=[
    Clip(80, 40, 69, caps=[Cap('v1_hook', 0, 2.2, MID)]),
    Hold(80, 69, 1.0, sfx=ticks(2)),
    Clip(80, 69, 72, speed=0.35),
    Clip(80, 72, 99, caps=[Cap('v1_l1', 0.1, 0.8, MID)]),
    Clip(80, 106, 126),
    Clip(80, 133, 162),
    Clip(80, 162, 182, caps=[Cap('v1_ok', 0.0, 1.2, MID)]),
    Clip(80, 194, 214),
    Clip(80, 221, 244),
    Clip(80, 244, 271, caps=[Cap('v1_l2', 0.1, 0.8, MID)]),
    Clip(80, 280, 300),
    Hold(80, 305, 1.2, sfx=ticks(2)),
    Clip(80, 305, 309, speed=0.35),
    Clip(80, 309, 400, caps=[Cap('v1_l3', 0.15, 1.2, LOW), Cap('v1_end', 1.45, 1.6, LOW)]),
])

# 2. DARE: run 151, levels 1-4 cleared first try.
RECIPES['02-four-in-a-row'] = dict(music=dict(bpm=128, prog=1, seed=2), items=[
    Clip(151, 42, 70, caps=[Cap('v2_hook', 0, 1.3, MID)]),
    Clip(151, 70, 81),
    Clip(151, 81, 102, caps=[Cap('v2_n1', 0.05, 0.65, MID)]),
    Clip(151, 115, 136),
    Clip(151, 140, 303, speed=2.2),
    Clip(151, 303, 324, caps=[Cap('v2_n2', 0.05, 0.65, MID)]),
    Clip(151, 337, 358),
    Clip(151, 362, 401),
    Hold(151, 401, 0.6, sfx=ticks(1)),
    Clip(151, 401, 405, speed=0.5),
    Clip(151, 405, 426, caps=[Cap('v2_n3', 0.05, 0.65, MID)]),
    Hold(151, 464, 1.0, sfx=ticks(2)),
    Clip(151, 464, 468, speed=0.4),
    Clip(151, 468, 490, caps=[Cap('v2_n4', 0.05, 1.0, MID)]),
    Hold(151, 489, 1.3, caps=[Cap('v2_end', 0.25, 1.05, LOW)]),
])

# 3. FAILS: three real quick-math misses, the last one ends the run.
RECIPES['03-easy-math'] = dict(music=dict(bpm=118, prog=3, seed=3), items=[
    Clip(109, 712, 740, caps=[Cap('v3_hook', 0, 2.6, LOW)]),
    Hold(109, 740, 1.9, sfx=ticks(3)),
    Clip(109, 740, 744, speed=0.35),
    Clip(109, 744, 771, caps=[Cap('v3_a1', 0.1, 0.8, MID)]),
    Flash(),
    Clip(16, 128, 155),
    Hold(16, 155, 1.7, caps=[Cap('v3_q', 0.05, 1.6, LOW)], sfx=ticks(3)),
    Clip(16, 155, 159, speed=0.35),
    Clip(16, 159, 186, caps=[Cap('v3_a2', 0.1, 0.8, MID)]),
    Flash(),
    Clip(80, 280, 305),
    Hold(80, 305, 1.7, caps=[Cap('v3_q3', 0.05, 1.6, LOW)], sfx=ticks(3)),
    Clip(80, 305, 309, speed=0.35),
    Clip(80, 309, 400, caps=[Cap('v3_a3', 0.15, 1.2, LOW), Cap('v3_end', 1.45, 1.6, LOW)]),
])

# 4. PROGRESSION: run 151 start to finish, sped up.
_p4 = [
    (42, 70, 2.5), (70, 81, 1.0), (81, 100, 2.5),
    (112, 138, 2.5), (140, 303, 4.0), (303, 322, 2.5),
    (334, 360, 2.5), (362, 405, 1.5), (405, 424, 2.5),
    (464, 468, 0.5), (468, 487, 2.5),
    (499, 525, 2.5), (527, 531, 0.5), (531, 556, 1.5),
    (565, 590, 2.5), (592, 707, 4.0), (707, 726, 2.5),
    (739, 764, 2.5), (766, 789, 1.0), (789, 808, 2.5),
    (820, 846, 2.5), (848, 853, 0.5), (853, 878, 1.5),
    (887, 912, 2.5), (914, 930, 1.0), (930, 949, 2.5),
    (961, 987, 2.5), (989, 1207, 4.0),
]
RECIPES['04-level-1-to-8'] = dict(music=dict(bpm=140, prog=0, seed=4), items=(
    [Clip(151, s, e, speed=sp) for s, e, sp in _p4[:1]]
    + [Clip(151, s, e, speed=sp) for s, e, sp in _p4[1:]]
    + [Clip(151, 1207, 1275)]
))
RECIPES['04-level-1-to-8']['items'][0].caps = [Cap('v4_hook', 0, 2.2, MID)]
# Caption beats: "It gets harder" on the first lost life, "1 life left" on the second.
_by_s = {it.s: it for it in RECIPES['04-level-1-to-8']['items']}
_by_s[531].caps = [Cap('v4_mid', 0.0, 1.6, MID)]
_by_s[853].caps = [Cap('v4_last', 0.0, 1.4, MID)]
RECIPES['04-level-1-to-8']['items'][-1].caps = [Cap('v4_end', 0.2, 2.1, LOW)]

# 5. MEMORY TEST: pairs (run 109), counting (run 20), colour (run 16).
RECIPES['05-memory-test'] = dict(music=dict(bpm=110, prog=2, seed=5), items=[
    Clip(109, 110, 137, caps=[Cap('v5_hook', 0, 1.7, LOW)]),
    Clip(109, 137, 150),
    Hold(109, 150, 0.9, caps=[Cap('v5_r1', 0.0, 1.3, LOW)]),
    Clip(109, 150, 177),
    Hold(109, 178, 1.5, caps=[Cap('v5_q1', 0.05, 1.45, LOW)], sfx=ticks(2)),
    Clip(109, 178, 272, speed=2.0),
    Clip(109, 272, 290),
    Flash(),
    Clip(20, 262, 287),
    Clip(20, 287, 329, caps=[Cap('v5_r2', 0.05, 1.3, LOW)]),
    Hold(20, 330, 1.3, caps=[Cap('v5_q2', 0.05, 1.25, LOW)], sfx=ticks(2)),
    Clip(20, 330, 336, speed=0.5),
    Clip(20, 336, 352),
    Flash(),
    Clip(16, 610, 635),
    Clip(16, 635, 671, caps=[Cap('v5_r3', 0.05, 1.15, LOW)]),
    Hold(16, 672, 1.3, caps=[Cap('v5_q3', 0.05, 1.25, LOW)], sfx=ticks(2)),
    Clip(16, 672, 678, speed=0.5),
    Clip(16, 678, 700),
    Hold(16, 699, 1.1, caps=[Cap('v5_end', 0.05, 1.05, LOW)]),
])

# 6. PATIENCE: wait for GO, hands off (run 10), then a held-target fail (run 20).
RECIPES['06-patience-test'] = dict(music=dict(bpm=116, prog=1, seed=6), items=[
    Clip(10, 384, 412, caps=[Cap('v6_hook', 0, 2.0, MID)]),
    Clip(10, 412, 478, caps=[Cap('v6_wait', 1.1, 1.1, MID)]),
    Clip(10, 478, 483, speed=0.4, caps=[Cap('v6_now', 0.0, 0.9, MID)]),
    Clip(10, 483, 504),
    Clip(10, 514, 542),
    Clip(10, 542, 654, caps=[Cap('v6_hands', 0.3, 2.8, MID)]),
    Clip(10, 654, 675),
    Flash(),
    Clip(20, 367, 395),
    Clip(20, 395, 436, caps=[Cap('v6_hold', 0.1, 1.25, MID)]),
    Clip(20, 436, 462, caps=[Cap('v6_nope', 0.1, 0.8, MID)]),
    Hold(20, 461, 0.5),
])

# 7. SPEED TEST: five colour levels from five runs; the last one is a miss.
# Intro cards are skipped: color_match re-deals its board when play starts,
# so the preview behind the intro card shows a different target colour.
def _colour(seed, q, play_end, result_end, n, first=False, fail=False):
    if first:
        hold = Hold(seed, q, 2.4, caps=[Cap('v7_hook', 0, 1.3, LOW), Cap(f'v7_n{n}', 1.3, 1.5, LOW)],
                    sfx=[('tick', 1.35), ('tick', 1.85)])
    else:
        hold = Hold(seed, q, 1.45, caps=[Cap(f'v7_n{n}', 0.0, 1.8, LOW)], sfx=ticks(2, 0.5))
    return [hold, Clip(seed, q, play_end, speed=0.35),
            Clip(seed, play_end, result_end, caps=[Cap('v7_fail', 0.1, 0.9, MID)] if fail else [])]


RECIPES['07-colour-speed-test'] = dict(music=dict(bpm=136, prog=3, seed=7), items=(
    _colour(109, 530, 534, 550, 1, first=True)
    + _colour(16, 392, 396, 412, 2)
    + _colour(151, 464, 468, 484, 3)
    + _colour(10, 232, 237, 253, 4)
    + _colour(80, 69, 72, 98, 5, fail=True)
    + [Hold(80, 97, 1.3, caps=[Cap('v7_end', 0.05, 1.25, LOW)])]
))

# 8. ENGAGEMENT: one level from each of the game's five challenge families.
RECIPES['08-worst-at'] = dict(music=dict(bpm=124, prog=0, seed=8), items=[
    Hold(109, 401, 1.3, caps=[Cap('v8_hook', 0, 1.3, MID)]),
    Clip(109, 385, 401, caps=[Cap('v8_k1', 0.0, 2.6, MID)]),
    Clip(109, 401, 465),
    Clip(20, 270, 287, caps=[Cap('v8_k2', 0.0, 2.4, LOW)]),
    Clip(20, 287, 336, speed=1.2),
    Clip(20, 336, 346),
    Clip(10, 279, 296, caps=[Cap('v8_k3', 0.0, 2.6, MID)]),
    Clip(10, 296, 351),
    Clip(10, 351, 370),
    Clip(151, 123, 140, caps=[Cap('v8_k4', 0.0, 2.6, MID)]),
    Clip(151, 140, 303, speed=2.5),
    Clip(151, 303, 315),
    Clip(16, 720, 737, caps=[Cap('v8_k5', 0.0, 1.9, MID)]),
    Clip(16, 737, 759),
    Clip(16, 759, 777),
    Hold(16, 776, 1.3, caps=[Cap('v8_end', 0.05, 1.25, LOW)]),
])

# 9. CLUTCH: run 16 loses two lives on level 2, then survives to level 8 on one.
RECIPES['09-one-life-left'] = dict(music=dict(bpm=126, prog=2, seed=9), items=[
    Clip(16, 229, 252, caps=[Cap('v9_hook', 0, 2.3, MID)]),
    Clip(16, 267, 287),
    Clip(16, 287, 333, speed=1.2),
    Clip(16, 333, 347, caps=[Cap('v9_alive', 0.0, 1.1, MID)]),
    Hold(16, 392, 0.6),
    Clip(16, 392, 396, speed=0.5),
    Clip(16, 396, 409),
    Clip(16, 438, 455),
    Clip(16, 455, 482),
    Clip(16, 482, 495, caps=[Cap('v9_calm', 0.0, 1.1, MID)]),
    Clip(16, 524, 541),
    Clip(16, 541, 576, speed=1.2),
    Clip(16, 576, 589),
    Clip(16, 618, 635),
    Clip(16, 635, 678, speed=1.3),
    Clip(16, 678, 691),
    Clip(16, 720, 737),
    Clip(16, 737, 759),
    Clip(16, 759, 772),
    Clip(16, 790, 818, caps=[Cap('v9_more', 0.0, 1.3, MID)]),
    Clip(16, 818, 828, speed=0.5),
    Clip(16, 828, 900, caps=[Cap('v9_close', 0.15, 1.05, LOW), Cap('v9_end', 1.25, 1.2, LOW)]),
])

# 10. POV: run 20 at double speed, from level 1 to the final miss.
_p10 = [
    (37, 69, 3.0), (69, 126, 2.0), (126, 152, 3.0),
    (152, 185, 3.0), (185, 228, 2.0), (228, 254, 3.0),
    (254, 287, 3.0), (287, 336, 2.0), (336, 362, 3.0),
    (362, 395, 3.0), (395, 436, 2.0), (436, 465, 1.6),
    (465, 497, 3.0), (497, 513, 1.5), (513, 539, 3.0),
    (539, 572, 3.0), (572, 686, 3.0), (686, 713, 3.0),
    (713, 746, 3.0), (746, 822, 2.0), (822, 848, 3.0),
    (848, 881, 3.0), (881, 885, 0.6), (885, 914, 1.6),
    (914, 946, 3.0), (946, 983, 1.5),
]
_i10 = [Clip(20, s, e, speed=sp) for s, e, sp in _p10] + [Clip(20, 983, 1060)]
_i10[0].caps = [Cap('v10_hook', 0, 2.4, MID)]
_i10[11].caps = [Cap('v10_mid', 0.0, 1.3, MID)]
_i10[23].caps = [Cap('v10_last', 0.0, 1.3, MID)]
_i10[-1].caps = [Cap('v10_end', 0.2, 2.2, LOW)]
RECIPES['10-pov-2am'] = dict(music=dict(bpm=132, prog=1, seed=10), items=_i10)
