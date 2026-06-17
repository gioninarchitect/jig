#!/usr/bin/env python3
# Fetch Bio Sculpture product og:image straight from their site (server-rendered, no JS/scraper needed).
import json, re, urllib.request, concurrent.futures

urls = json.load(open('/Users/florisolivier/origin/inventory/BioSculpture/gemini_product_urls.json'))
HDRS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

def fetch(u):
    try:
        m = re.search(r'/product/no-0*(\d+)-([a-z0-9-]+)/', u)
        if not m:
            return None
        num, name = int(m.group(1)), m.group(2).replace('-', ' ').title()
        req = urllib.request.Request(u, headers=HDRS)
        html = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
        og = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        img = og.group(1) if og else ''
        if img and 'cropped' not in img and 'logo' not in img.lower():
            return {'number': num, 'name': name, 'image': img}
    except Exception as e:
        return {'number': None, 'error': str(e), 'url': u}
    return None

out, errs = [], []
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    for r in ex.map(fetch, urls):
        if r and r.get('image'):
            out.append(r)
        elif r and r.get('error'):
            errs.append(r)

out.sort(key=lambda x: x['number'])
json.dump(out, open('/Users/florisolivier/origin/inventory/BioSculpture/bio_images.json', 'w'), indent=1)
print(f'fetched images: {len(out)} / {len(urls)} urls · errors: {len(errs)}')
for o in out[:8]:
    print(f"  No.{o['number']} {o['name']} -> {o['image'].split('/')[-1]}")
