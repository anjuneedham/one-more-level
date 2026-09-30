import os, sys, time
import shorts
from recipes import RECIPES
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, 'shorts_out'), exist_ok=True)
names = sys.argv[1:] or list(RECIPES)
for name in names:
    r = RECIPES[name]
    t = time.time()
    out = os.path.join(HERE, 'shorts_out', f'{name}.mp4')
    d = shorts.render(r['items'], out, os.path.join(HERE, 'pills'), music_opts=r['music'])
    print(f'{name}: {d:.1f}s rendered in {time.time()-t:.0f}s', flush=True)
