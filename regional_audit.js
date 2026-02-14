import fs from 'fs';
const data = JSON.parse(fs.readFileSync('surveys_raw_clean.json', 'utf8'));

const regions = new Map();

data.forEach(s => {
    if (!regions.has(s.시군)) {
        regions.set(s.시군, { reg_sw: 0, short_sw: 0, insts: [] });
    }
    const r = regions.get(s.시군);
    const rs = (s.전담사회복지사_남 || 0) + (s.전담사회복지사_여 || 0);
    const ss = (s.단기_전담인력_사회복지사_남 || 0) + (s.단기_전담인력_사회복지사_여 || 0);
    r.reg_sw += rs;
    r.short_sw += ss;
    if (ss > 0 || rs > 0) {
        r.insts.push({ name: s.기관명, reg: rs, short: ss });
    }
});

console.log('--- Regional Audit ---');
regions.forEach((v, k) => {
    console.log(`${k}: Regular SW=${v.reg_sw}, Short SW=${v.short_sw}`);
    if (v.short_sw > 0) {
        v.insts.forEach(i => console.log(`  - ${i.name}: Reg=${i.reg}, Short=${i.short}`));
    }
});
