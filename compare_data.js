import fs from 'fs';
const data = JSON.parse(fs.readFileSync('surveys_raw_clean.json', 'utf8'));

const uiryeong = data.find(s => s.기관명 === '의령노인통합지원센터');
const others = data.filter(s => s.기관명 !== '의령노인통합지원센터' && (s.단기_전담인력_사회복지사_남 > 0 || s.단기_전담인력_사회복지사_여 > 0));

console.log('--- Uiryeong (The 5 SW one) ---');
console.log(JSON.stringify(uiryeong, null, 2));

console.log('\n--- Others (The 1-2 SW ones) ---');
console.log(JSON.stringify(others[0], null, 2));
