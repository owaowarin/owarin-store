/* OWARIN — Card Studio test harness
   รันเลย์เอาต์จริงจาก owarin_arrival_card_studio.html ใน Node โดย stub canvas + DOM
   จับ NaN / undefined / ค่าผิดพลาด ที่การตรวจแบบอ่านโค้ดจับไม่ได้

   ใช้:  node owarin_card_test.mjs
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(path.join(DIR, 'owarin_arrival_card_studio.html'), 'utf8');

/* ---------- ตรวจจับค่าผิดพลาดในทุกคำสั่งวาด ---------- */
const problems = [];
let drawn = [];
let painted = [];   // {text,px} ของทุก fillText
let images = [];    // {w,h} ของทุก drawImage
let ctxLabel = '';
function guard(name, args) {
  args.forEach((v, i) => {
    if (typeof v === 'number' && !Number.isFinite(v))
      problems.push(`${ctxLabel} · ${name}() อาร์กิวเมนต์ที่ ${i + 1} = ${v}`);
    if (typeof v === 'string' && /undefined|NaN/.test(v))
      problems.push(`${ctxLabel} · ${name}() ข้อความมี "${v.match(/undefined|NaN/)[0]}" → "${v.slice(0, 60)}"`);
  });
}

function makeCtx() {
  const noop = () => {};
  const ctx = {
    canvas: { width: 0, height: 0 },
    font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000',
    lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic',
    globalAlpha: 1, letterSpacing: '0px', shadowColor: '', shadowBlur: 0, shadowOffsetY: 0,
    save: noop, restore: noop, beginPath: noop, closePath: noop,
    clip: noop, setLineDash: noop, stroke: noop, fill: noop,
    moveTo: (...a) => guard('moveTo', a), lineTo: (...a) => guard('lineTo', a),
    arc: (...a) => guard('arc', a), arcTo: (...a) => guard('arcTo', a),
    ellipse: (...a) => guard('ellipse', a),
    rect: (...a) => guard('rect', a),
    fillRect: (...a) => guard('fillRect', a),
    strokeRect: (...a) => guard('strokeRect', a),
    clearRect: (...a) => guard('clearRect', a),
    fillText(t, x, y) {
      const px = parseFloat((this.font.match(/(\d+(?:\.\d+)?)px/) || [0, 0])[1]) || 0;
      drawn.push(String(t)); painted.push({ text: String(t), px });
      guard('fillText', [t, x, y]);
    },
    drawImage: (...a) => { const [, , , w, h] = a; images.push({ w, h }); guard('drawImage', a.slice(1)); },
    createLinearGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(64 * 4).fill(230) }),
    measureText(t) {
      const px = parseFloat((this.font.match(/(\d+(?:\.\d+)?)px/) || [0, 10])[1]) || 10;
      const s = String(t ?? '');
      return { width: s.length * px * 0.56,
               actualBoundingBoxAscent: px * 0.72,
               actualBoundingBoxDescent: px * 0.2 };
    },
    toBlob: noop
  };
  return ctx;
}

/* ---------- DOM stub เท่าที่โค้ดใช้ ---------- */
function el(id) {
  const e = {
    id, value: '', checked: false, textContent: '', innerHTML: '', className: '',
    style: {}, children: [], dataset: {}, type: '',
    addEventListener: () => {}, removeEventListener: () => {},
    appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [],
    getContext: () => e._ctx || (e._ctx = makeCtx()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 500 }),
    closest: () => null, dispatchEvent: () => {}, click: () => {},
    setPointerCapture: () => {}, toBlob: () => {}, replaceWith: () => {}
  };
  return e;
}
const NODES = new Map();
const $ = id => { if (!NODES.has(id)) NODES.set(id, el(id)); return NODES.get(id); };

/* ---------- ดึงเฉพาะส่วนที่ใช้เรนเดอร์ออกมา ---------- */
const script = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];

function slice(from, to) {
  const a = script.indexOf(from);
  if (a < 0) throw new Error('หาไม่เจอ: ' + from);
  const b = to ? script.indexOf(to, a) : script.length;
  return script.slice(a, b < 0 ? script.length : b);
}
// รวมทุกอย่างตั้งแต่ประกาศ state จนจบฟังก์ชันวาด แล้วตัดเฉพาะส่วนที่ต้องพึ่ง DOM/เบราว์เซอร์ออก
const body = script.slice(script.indexOf('const S={'), script.indexOf('/* ---------- render'));

const src = `
${body}
return { S, P, PRESET, SAFE, dims, topInset, botInset, sideInset, safeProfile,
         layGrid, laySale, drawSafe,
         setSlots(v){ slots = v; },
         setLogo(v){ logoImg = v; } };
`;

// ไม่ส่งตัวแปรที่ไฟล์ประกาศเองซ้ำ — ส่งเฉพาะ $ / window / document แล้วเซ็ตค่าผ่าน setSlots()
const factory = new Function('$', 'window', 'document', src);

/* ---------- รันทุกโหมด ---------- */
/* สำคัญ: ต้องทดสอบ "สถานะจริงที่เกิดขึ้นได้" ไม่ใช่เฉพาะคู่ที่เราคิดว่าถูก
   ผู้ใช้สลับขนาดโดยที่ safeMode ยังค้างค่าเดิม → ratio กับ safeMode ไม่ตรงกันได้เสมอ
   บั๊ก NaN ที่เจอจริงเกิดจากเคสนี้พอดี (ratio 4:5 + safeMode stories) */
const RATIOS = ['1:1', '4:5', '9:16'];
const SAFEMODES = ['feed', 'stories', 'reels', 'light', 'ค่าที่ไม่มีอยู่จริง'];
const MODES = RATIOS.flatMap(r => SAFEMODES.map(m => [r, m]));
const TEXT = {
  h1: 'NEW ARRIVAL', h2: 'GAME GUIDE BOOKS', date: '8/8',
  jp: '数量限定 中古特別価格', endline: 'END : 2026.8.31 MON',
  note: 'มีชิ้นเดียว หมดแล้วหมดเลย · ไม่ร่วมกับโปรโมชันอื่น'
};
const FAKE_IMG = { width: 1080, height: 1080, complete: true, src: 'x' };

/* ---------- ตรวจสถิต: ห้ามฮาร์ดโค้ดขนาดฟอนต์ / ทุกคีย์ใน P ต้องมีสไลเดอร์ ---------- */
{
  const lay = script.slice(script.indexOf('function layGrid'), script.indexOf('function drawSafe'));
  const hard = [...new Set([...lay.matchAll(/\$\{W\*(0\.0\d+)\}px/g)].map(m => m[1]))];
  if (hard.length) { console.log('FAIL  ยังมีขนาดฟอนต์ฮาร์ดโค้ดในเลย์เอาต์:', hard.join(', ')); process.exit(1); }

  const Pk = [...script.slice(script.indexOf('const P={'), script.indexOf('};', script.indexOf('const P={')))
    .matchAll(/(\w+):[-\d.]+/g)].map(m => m[1]);
  const html = HTML;
  const noSlider = Pk.filter(k => !html.includes(`id="${k}"`));
  if (noSlider.length) { console.log('FAIL  คีย์ใน P ที่ไม่มีตัวควบคุมใน UI:', noSlider.join(', ')); process.exit(1); }

  const presets = [...script.slice(script.indexOf('const PRESET={'), script.indexOf('\n};', script.indexOf('const PRESET={')))
    .matchAll(/'([\w:.-]+)'\s*:\{([^{}]*)\}/g)];
  for (const [, name, bodyTxt] of presets) {
    const keys = [...bodyTxt.matchAll(/(\w+):/g)].map(m => m[1]);
    const miss = Pk.filter(k => !keys.includes(k));
    if (miss.length) { console.log(`FAIL  พรีเซ็ต ${name} ขาดคีย์:`, miss.join(', ')); process.exit(1); }
  }
  /* ค่าเริ่มต้นทุกตัว (ทั้ง P และ PRESET) ต้องอยู่ในช่วงของสไลเดอร์
     ถ้าหลุดช่วง = สไลเดอร์เลื่อนไปสุดขอบแล้วภาพเพี้ยน หรือองค์ประกอบหลุดออกนอกเฟรมจนหายไป
     บั๊ก "โลโก้หาย" เกิดจากเคสนี้: jpSize/markSize ยังเป็นสเกลเก่า (40 / 150)
     พอเปลี่ยนความหมายเป็น % ของความกว้าง กลายเป็น 432px / 1620px วาดหลุดเฟรม */
  const range = {};
  for (const m of HTML.matchAll(/id="(\w+)"[^>]*min="([-\d.]+)"[^>]*max="([-\d.]+)"/g))
    range[m[1]] = [parseFloat(m[2]), parseFloat(m[3])];
  const chk = (label, txt) => {
    for (const m of txt.matchAll(/(\w+):(-?[\d.]+)/g)) {
      const r = range[m[1]]; if (!r) continue;
      const v = parseFloat(m[2]);
      if (v < r[0] || v > r[1]) {
        console.log(`FAIL  ${label} · ${m[1]}=${v} หลุดช่วงสไลเดอร์ ${r[0]}–${r[1]}`);
        process.exit(1);
      }
    }
  };
  chk('const P', script.slice(script.indexOf('const P={'), script.indexOf('};', script.indexOf('const P={'))));
  for (const [, name, bodyTxt] of presets) chk('พรีเซ็ต ' + name, bodyTxt);

  /* คีย์ localStorage ต้องขึ้นเวอร์ชันเมื่อความหมายของค่าเปลี่ยน */
  const lsKey = (script.match(/const LS='([^']+)'/) || [])[1];
  if (!lsKey || !/v\d+$/.test(lsKey)) { console.log('FAIL  คีย์ localStorage ต้องลงท้ายด้วยเลขเวอร์ชัน'); process.exit(1); }

  console.log(`ตรวจสถิตผ่าน · ไม่มีขนาดฮาร์ดโค้ด · P ${Pk.length} คีย์มีตัวควบคุมครบ · ` +
              `ค่าเริ่มต้นอยู่ในช่วงสไลเดอร์ทั้งหมด · พรีเซ็ตครบทุกชุด · LS=${lsKey}`);
}

let ok = 0, total = 0;
for (const [ratio, mode] of MODES) {
  for (const lay of ['grid', 'sale']) {
    for (const cells of [6, 9]) {
      if (lay === 'sale' && cells === 9) continue;
      for (const [showName, showPrice, showJP] of
           [[false, true, true], [true, true, true], [true, false, false], [false, false, true]]) {
        total++;
        problems.length = 0;
        ctxLabel = `${ratio}/${mode} ${lay} ${cells}ช่อง name=${+showName} price=${+showPrice} jp=${+showJP}`;

        NODES.clear();
        drawn = []; painted = []; images = [];
        // ช่องข้อความทั้งหมดตั้งเป็นค่าที่ไม่ซ้ำใคร เพื่อพิสูจน์ว่าถูกใช้จริง
        const CUSTOM = { storeName:'ร้านทดสอบ', storeJP:'テスト', soldText:'ขายแล้ว',
                         pricePre:'฿', priceSuf:' บ.', labWas:'เดิม', labNow:'ลด',
                         labOne:'ราคาเดียว', notePre:'» ' };
        for (const [k, v] of Object.entries(CUSTOM)) $(k).value = v;
        for (const k of ['colPage','colInk','colSub','colAccent','colCut']) $(k).value = '#123456';
        $('showName').checked = showName;
        $('showPrice').checked = showPrice;
        $('showJP').checked = showJP;
        $('cardColor').value = '#ffffff';
        $('preview');

        const slots = Array.from({ length: cells }, (_, i) => ({
          name: ['Final Fantasy VII','Metal Gear Solid 2','Silent Hill 3',
                 'Resident Evil 4','Dragon Quest VIII','Onimusha',
                 'Castlevania','Chrono Cross','Bully'][i],
          price: String(200 + i * 10), price2: i === 0 ? '180' : '',
          sold: i === 2, zoom: 100, offY: 0, img: FAKE_IMG, src: 'x'
        }));

        let api;
        try {
          api = factory($, { OWARIN_COVERS: [], OWARIN_LOGO: null },
            { createElement: () => el('tmp'), addEventListener: () => {},
              querySelectorAll: () => [], querySelector: () => null, fonts: { ready: Promise.resolve() } },
            );
        } catch (e) { problems.push('โหลดโค้ดไม่ผ่าน: ' + e.message); }

        if (api) {
          api.setSlots(slots); api.setLogo(FAKE_IMG);
          api.S.ratio = ratio; api.S.safeMode = mode; api.S.lay = lay;
          api.S.cells = cells; api.S.sel = 0; api.S.safe = true;
          Object.assign(api.P, api.PRESET[ratio === '9:16' ? '9:16-' + mode : ratio] || api.PRESET['4:5']);
          const [W, H] = api.dims();
          const ctx = makeCtx();
          try {
            if (lay === 'grid') api.layGrid(ctx, W, H, TEXT);
            else api.laySale(ctx, W, H, TEXT);
            api.drawSafe(ctx, W, H);
          } catch (e) { problems.push('เรนเดอร์ error: ' + e.message); }

          // ข้อความที่ผู้ใช้ตั้งต้องปรากฏบนการ์ดจริง ไม่ใช่ค่าฮาร์ดโค้ดเดิม
          const joined = drawn.join('\u0001');
          if (/OWARIN STORE|オワリン商店|^SOLD$/.test(joined))
            problems.push('ยังวาดข้อความฮาร์ดโค้ดเดิมแทนค่าที่ผู้ใช้ตั้ง');
          if (showJP && !joined.includes(CUSTOM.storeJP))
            problems.push('ไม่พบข้อความญี่ปุ่นที่ผู้ใช้ตั้ง');
          if (!joined.includes(CUSTOM.storeName))
            problems.push('ไม่พบชื่อร้านที่ผู้ใช้ตั้ง');
          if (showPrice && lay === 'grid' && !drawn.some(s => s.startsWith('฿') && s.endsWith(' บ.')))
            problems.push('คำนำหน้า/ต่อท้ายราคาไม่ถูกใช้');
          if (lay === 'grid' && !joined.includes(CUSTOM.soldText))
            problems.push('ข้อความ SOLD ที่ผู้ใช้ตั้งไม่ถูกใช้');
          if (lay === 'sale' && !joined.includes(CUSTOM.notePre))
            problems.push('คำนำหน้าหมายเหตุไม่ถูกใช้');

          /* บั๊ก v20: บรรทัดญี่ปุ่นถูกวาดจริงแต่ขนาด 0.48px และตราดอกไม้ 2.7px = มองไม่เห็น
             เทสต์เดิมผ่านเพราะเช็คแค่ "ถูกเรียกมั้ย" ไม่ได้เช็ค "ใหญ่พอให้เห็นมั้ย" */
          const MIN_TEXT_PX = W * 0.008;   // ~8.6px ที่ความกว้าง 1080
          const tiny = painted.filter(x => x.text.trim() && x.px < MIN_TEXT_PX);
          if (tiny.length)
            problems.push(`ตัวอักษรเล็กจนมองไม่เห็น: ${tiny.map(x => `"${x.text.slice(0,14)}"@${x.px.toFixed(1)}px`).slice(0,3).join(' ')}`);

          const MIN_IMG = W * 0.02;        // ~22px
          const tinyImg = images.filter(x => Number.isFinite(x.w) && x.w > 0 && x.w < MIN_IMG);
          if (tinyImg.length)
            problems.push(`รูปเล็กจนมองไม่เห็น: ${tinyImg.map(x => x.w.toFixed(1) + 'px').slice(0,3).join(' ')}`);

          // ตราดอกไม้ต้องถูกวาดจริงเมื่อ markSize > 0
          if (api.P.markSize > 0 && !images.some(x => x.w >= MIN_IMG && x.h >= MIN_IMG))
            problems.push('ตั้ง markSize > 0 แต่ตราดอกไม้ไม่ถูกวาด');

          const p = api.safeProfile();
          if (!p || typeof p.t !== 'number') problems.push('safeProfile ไม่คืนโปรไฟล์ที่ถูกต้อง');
          if (!p || !p.label) problems.push('safeProfile ไม่มี label');
        }

        if (problems.length) {
          console.log(`FAIL  ${ctxLabel}`);
          [...new Set(problems)].slice(0, 4).forEach(m => console.log('        ' + m));
        } else ok++;
      }
    }
  }
}
console.log(`\n${ok}/${total} เคสผ่าน`);
process.exit(ok === total ? 0 : 1);
