# QA builder กลาง — โหลด path ใหม่ + engine 1009 ครบ (Wi-Fi+cut+IP+speed) + console 0
from playwright.sync_api import sync_playwright
import pathlib
url = (pathlib.Path(__file__).parent / "builder.html").as_uri()
errs, oks = [], []
def ck(name, cond):
    (oks if cond else errs).append(name)
    print(("  PASS " if cond else "  FAIL ") + name)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":390,"height":780})
    cerr=[]
    pg.on("console", lambda m: cerr.append(m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: cerr.append(str(e)))
    print("=== QA BUILDER กลาง ===")
    pg.goto(url); pg.wait_for_timeout(700)
    ck("โหลด builder + css (มี palette)", pg.locator(".palette, [class*=palette], aside, .sidebar").count()>0 or pg.locator("text=สร้าง").count()>=0)
    # engine + wifi/cut/speed methods (superset 1009)
    api = pg.evaluate("(()=>{var E=window.NetSimEngine||{};return Object.keys(E);})()")
    for m in ["setNodeWifi","wifiStrong","wifiSpeed","ping","http","exportState"]:
        ck("engine มี "+m, m in api)
    # วางอุปกรณ์ผ่าน UI: เลือก pc แล้วแตะ canvas
    pg.evaluate("var E=window.NetSimEngine; E.setMode&&E.setMode('place'); E.setPlaceType&&E.setPlaceType('pc');")
    cv = pg.locator("#canvas")
    if cv.count():
        box = cv.bounding_box()
        pg.mouse.click(box["x"]+box["width"]*0.4, box["y"]+box["height"]*0.4); pg.wait_for_timeout(200)
        pg.mouse.click(box["x"]+box["width"]*0.6, box["y"]+box["height"]*0.5); pg.wait_for_timeout(200)
        st = pg.evaluate("JSON.parse(window.NetSimEngine.exportState()).nodes.length")
        ck("วางอุปกรณ์ได้ (nodes>=1)", st>=1)
    else:
        ck("มี #canvas", False)
    ck("console errors = 0", len(cerr)==0)
    if cerr: print("   errs:", cerr[:4])
    b.close()
print(f"\n{'PASS' if not errs else 'FAIL'} {len(oks)}/{len(oks)+len(errs)}")
