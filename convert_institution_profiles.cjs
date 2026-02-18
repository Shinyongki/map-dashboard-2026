const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile('c:/Projects/welfare-resource-map-2026/수행기관 일반 현황.xls');
const ws = wb.Sheets['Sheet2'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Skip header rows (0, 1), data starts at row 2
const profiles = [];

for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r[4]) continue; // skip if no 수행기관코드

    const yesNo = (v) => v === '해당';

    profiles.push({
        code: String(r[4]).trim(),                    // 수행기관코드
        region: String(r[1]).trim(),                   // 지자체
        delegationType: String(r[5]).trim(),           // 위수탁구분
        delegationPeriod: String(r[6]).trim(),         // 위수탁기간
        yearHistory: {
            2020: yesNo(r[7]),
            2021: yesNo(r[8]),
            2022: yesNo(r[9]),
            2023: yesNo(r[10]),
            2024: yesNo(r[11]),
            2025: yesNo(r[12]),
            2026: yesNo(r[13]),
        },
        facilityType: String(r[14]).trim(),            // 시설유형구분
        services: {
            specialized: yesNo(r[15]),                 // 특화서비스
            emergencySafety: yesNo(r[16]),             // 응급안전안심서비스
            homeVisitCare: yesNo(r[17]),               // 방문요양서비스
            homeSeniorWelfare: yesNo(r[18]),           // 재가노인복지서비스
            socialServiceCenter: yesNo(r[19]),         // 사회서비스원 소속
            seniorJobDispatch: yesNo(r[20]),           // 사회서비스형 노인일자리
        },
        corporation: {
            name: String(r[21]).trim(),                // 수탁법인명
            registrationNo: String(r[23]).trim(),      // 사업자등록번호
            uniqueNo: String(r[24]).trim(),            // 고유번호
        },
        name: String(r[25]).trim(),                    // 수행기관명
        director: String(r[26]).trim(),                // 기관장명
        zipCode: r[27] ? String(r[27]).trim() : '',
        address: typeof r[28] === 'string' ? r[28].trim() : '',
        contact: {
            mainPhone: String(r[31] || '').trim(),     // 기관 대표전화
            phone: String(r[32] || '').trim(),         // 메인 연락처
            emergency: String(r[33] || '').trim(),     // 긴급연락처
            fax: String(r[34] || '').trim(),
            email: String(r[35] || '').trim(),
        },
        allocation: {
            mow: {
                socialWorker: Number(r[36]) || 0,      // 복지부 배정 전담사회복지사
                careProvider: Number(r[37]) || 0,      // 복지부 배정 생활지원사
                users: Number(r[38]) || 0,             // 복지부 배정 대상자
            },
            actual: {
                socialWorkerAllocated: Number(r[39]) || 0,
                socialWorkerHired: Number(r[40]) || 0,
                careProviderAllocated: Number(r[41]) || 0,
                careProviderHired: Number(r[42]) || 0,
                usersAllocated: Number(r[43]) || 0,
                usersServed: Number(r[44]) || 0,
            },
        },
    });
}

const outPath = path.join(__dirname, 'public', 'data', 'institution_profiles.json');
fs.writeFileSync(outPath, JSON.stringify(profiles, null, 2), 'utf-8');
console.log(`Converted ${profiles.length} institution profiles → ${outPath}`);
