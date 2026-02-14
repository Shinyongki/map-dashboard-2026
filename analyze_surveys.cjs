const fs = require('fs');
const data = JSON.parse(fs.readFileSync('surveys_raw.json', 'utf8'));

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

console.log('Regular Staff:', sw_m + sw_f + cg_m + cg_f);
console.log('Short-term SW:', short_sw_m + short_sw_f);
console.log('Short-term CG:', short_cg_m + short_cg_f);
console.log('Total (Regular + Short SW):', (sw_m + sw_f + cg_m + cg_f) + (short_sw_m + short_sw_f));
console.log('Total (All):', (sw_m + sw_f + cg_m + cg_f) + (short_sw_m + short_sw_f) + (short_cg_m + short_cg_f));
