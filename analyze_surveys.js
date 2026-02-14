import fs from 'fs';

let data;
try {
    const raw = fs.readFileSync('surveys_raw_clean.json', 'utf8');
    data = JSON.parse(raw);
} catch (e) {
    console.error('Failed to read or parse JSON:', e);
    process.exit(1);
}

let sw_m = 0, sw_f = 0, cg_m = 0, cg_f = 0;
let short_sw_m = 0, short_sw_f = 0, short_cg_m = 0, short_cg_f = 0;

data.forEach(s => {
    sw_m += s.전담사회복지사_남 || 0;
    sw_f += s.전담사회복지사_여 || 0;
    cg_m += s.생활지원사_남 || 0;
    cg_f += s.생활지원사_여 || 0;
    short_sw_m += s.단기_전담인력_사회복지사_남 || 0;
    short_sw_f += s.단기_전담인력_사회복지사_여 || 0;
    short_cg_m += s.단기_전담인력_돌봄제공인력_남 || 0;
    short_cg_f += s.단기_전담인력_돌봄제공인력_여 || 0;
});

console.log('--- Worker Count Audit ---');
console.log('Regular SW (M/F):', sw_m + sw_f);
console.log('Regular CG (M/F):', cg_m + cg_f);
console.log('Regular Staff Total:', sw_m + sw_f + cg_m + cg_f);
console.log('Short-term SW (M/F):', short_sw_m + short_sw_f);
console.log('Short-term CG (M/F):', short_cg_m + short_cg_f);
console.log('--------------------------');
console.log('Sum (Regular + Short SW):', (sw_m + sw_f + cg_m + cg_f) + (short_sw_m + short_sw_f));
console.log('Sum (All Groups):', (sw_m + sw_f + cg_m + cg_f) + (short_sw_m + short_sw_f) + (short_cg_m + short_cg_f));
