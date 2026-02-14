import fs from 'fs';
const data = JSON.parse(fs.readFileSync('surveys_raw_clean.json', 'utf8'));

console.log('--- Institutions with Short-term SW ---');
data.forEach(s => {
    const sw = (s.단기_전담인력_사회복지사_남 || 0) + (s.단기_전담인력_사회복지사_여 || 0);
    if (sw > 0) {
        console.log(`${s.기관명} (${s.시군}): ${sw}명 (거점여부: ${s.거점수행기관여부})`);
    }
});
