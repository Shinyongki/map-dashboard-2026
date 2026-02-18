const fs = require('fs');
const path = require('path');

const dataDir = 'C:/Projects/welfare-resource-map-2026/public/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ... (Existing Public/Specialized Data codes will be preserved/merged) ...

// 3. 응급안전안심서비스 거점기관 (Emergency Safety Hubs)
const emergencyHubs = [
    { name: "경상남도사회서비스원 (광역)", address: "경상남도 김해시 주촌면 골든루트로 80-16", phone: "055-328-9866", category: "응급안전" },
    { name: "함양군 응급안전안심센터", address: "경상남도 함양군 함양읍 고운로 34", phone: "055-964-9921", category: "응급안전" },
    { name: "합천군 응급안전안심센터 (지역자활)", address: "경상남도 합천군 합천읍 동서로 39", phone: "055-933-1121", category: "응급안전" },
    // ... more to be added if found
];

// 4. 민간 기업 및 단체 (Volunteer Centers as proxy)
const privateOrgs = [
    { name: "경상남도자원봉사센터", address: "경남 창원시 성산구 용지로 240", phone: "055-281-1365", category: "자원봉사" },
    { name: "창원시자원봉사센터", address: "경남 창원시 성산구 상남로58번길 21", phone: "055-225-3850", category: "자원봉사" },
    { name: "진주시자원봉사센터", address: "경남 진주시 동진로 155", phone: "055-749-5424", category: "자원봉사" },
    { name: "통영시자원봉사센터", address: "경남 통영시 통영해안로 515", phone: "055-650-4290", category: "자원봉사" },
    { name: "사천시자원봉사센터", address: "경남 사천시 동금5길 15", phone: "055-831-5792", category: "자원봉사" },
    { name: "김해시자원봉사센터", address: "경남 김해시 가야로 432", phone: "055-330-7391", category: "자원봉사" },
    { name: "밀양시자원봉사센터", address: "경남 밀양시 밀성로3길 9", phone: "055-354-1365", category: "자원봉사" },
    { name: "거제시자원봉사센터", address: "경남 거제시 고현로2길 42", phone: "055-632-0400", category: "자원봉사" },
    { name: "양산시자원봉사센터", address: "경남 양산시 옥곡2길 20", phone: "055-385-8100", category: "자원봉사" },
    { name: "의령군자원봉사센터", address: "경남 의령군 의령읍 의병로8길 44", phone: "055-570-4976", category: "자원봉사" },
    { name: "남해군자원봉사센터", address: "경남 남해군 남해읍 망운로32", phone: "055-860-3883", category: "자원봉사" },
    { name: "거창군자원봉사센터", address: "경남 거창군 아림로 66", phone: "055-940-3904", category: "자원봉사" }
];

// 5. 지역 사회복지시설 (노인/종합/장애인복지관)
const regionalWelfare = [
    // 종합사회복지관
    { name: "경남종합사회복지관", address: "경남 창원시 마산회원구 팔용로 272", phone: "", category: "종합복지관" },

    // 장애인복지관
    { name: "경상남도장애인종합복지관", address: "경남 창원시 의창구 봉곡로97번길 85", phone: "", category: "장애인복지관" },
    { name: "창원시 장애인복지관", address: "창원시 의창구 봉곡로 97번길 87", phone: "", category: "장애인복지관" },
    { name: "마산시 장애인복지관", address: "창원시 마산합포구 반월서7길 59", phone: "", category: "장애인복지관" },
    { name: "진해시 장애인복지관", address: "창원시 진해구 진해대로 1101", phone: "", category: "장애인복지관" },
    { name: "진주시 장애인종합복지관", address: "진주시 상대동 33-119", phone: "", category: "장애인복지관" },
    { name: "김해시 장애인종합복지관", address: "김해시 삼계동 32", phone: "", category: "장애인복지관" },
    { name: "창녕군 장애인종합복지관", address: "창녕군 창녕읍 탐하리 37", phone: "", category: "장애인복지관" },
    { name: "사천시 장애인종합복지관", address: "사천시 용현면 덕곡리 536-17", phone: "", category: "장애인복지관" },
    { name: "남해 장애인종합복지관", address: "남해군 이동면 초음리 1387", phone: "", category: "장애인복지관" },

    // 노인복지관 (시니어클럽 포함)
    { name: "경남노인통합지원센터", address: "창원시 마산회원구 팔용로 272", phone: "", category: "노인복지관" },
    { name: "경남함안 시니어클럽", address: "경남 함안군 가야읍 함마대로 1524", phone: "", category: "노인복지관" },
    { name: "경남남해 시니어클럽", address: "경남 남해군 남해읍 화전로43번길 11-15", phone: "", category: "노인복지관" },
    { name: "경남의령 시니어클럽", address: "경남 의령군 의령읍 의병로 202", phone: "", category: "노인복지관" },
    { name: "경남함양 시니어클럽", address: "경상남도 함양군 함양읍 함양로 983-33", phone: "", category: "노인복지관" },
    { name: "경남하동 시니어클럽", address: "경상남도 하동군 하동읍 중앙2길 12", phone: "", category: "노인복지관" },
    { name: "경남산청 시니어클럽", address: "경남 산청군 산청읍 웅석봉로 67번길 24", phone: "", category: "노인복지관" },
    { name: "경남웅상 시니어클럽", address: "경남 양산시 평산로 43", phone: "", category: "노인복지관" },
    { name: "경남고성 시니어클럽", address: "경남 고성군 고성읍 송학로47-3", phone: "", category: "노인복지관" },
    { name: "경남진주서부 시니어클럽", address: "경상남도 진주시 순환로573번길 62", phone: "", category: "노인복지관" },
    { name: "경남마산회원 시니어클럽", address: "경남 창원시 마산회원구 회원동북로 18", phone: "", category: "노인복지관" },
    { name: "경남성산 시니어클럽", address: "경남 창원시 성산구 용지로 96", phone: "", category: "노인복지관" }
];

fs.writeFileSync(path.join(dataDir, 'emergency_hubs.json'), JSON.stringify(emergencyHubs, null, 2));
fs.writeFileSync(path.join(dataDir, 'private_orgs.json'), JSON.stringify(privateOrgs, null, 2));
fs.writeFileSync(path.join(dataDir, 'regional_welfare.json'), JSON.stringify(regionalWelfare, null, 2));

console.log('Created emergency_hubs.json, private_orgs.json, and regional_welfare.json');
