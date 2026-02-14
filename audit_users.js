import fs from 'fs';
const data = JSON.parse(fs.readFileSync('surveys_raw_clean.json', 'utf8'));

let m = 0, f = 0;
data.forEach(s => {
    m += s.단기_남 || 0;
    f += s.단기_여 || 0;
});
console.log(`Short Users: M=${m}, F=${f}, Total=${m + f}`);

let gen = 0;
data.forEach(s => {
    gen += (s.일반중점_남_일반 || 0) + (s.일반중점_남_중점 || 0) + (s.일반중점_여_일반 || 0) + (s.일반중점_여_중점 || 0);
});
console.log(`General Users Total: ${gen}`);
