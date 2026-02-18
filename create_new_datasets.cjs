const fs = require('fs');
const path = require('path');

const dataDir = 'C:/Projects/welfare-resource-map-2026/public/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// 1. 공공·행정 기관 (보건소, 경찰서 등) 
// - 소방서는 이미 fire_stations.json에 있음 (나중에 통합하거나 유지)
const publicAdminData = [
    // 보건소 (20개소)
    { name: "거제시보건소", address: "경남 거제시 수양로 506", phone: "", category: "보건소" },
    { name: "거창군보건소", address: "경남 거창군 거창읍 거함대로 3079", phone: "", category: "보건소" },
    { name: "고성군보건소", address: "경남 고성군 고성읍 남포로79번길 103-3", phone: "", category: "보건소" },
    { name: "김해시보건소", address: "경남 김해시 분성로 227", phone: "", category: "보건소" },
    { name: "남해군보건소", address: "경남 남해군 남해읍 선소로 6", phone: "", category: "보건소" },
    { name: "밀양시보건소", address: "경남 밀양시 삼문중앙로 41", phone: "", category: "보건소" },
    { name: "사천시보건소", address: "경남 사천시 용현면 시청3길 43", phone: "", category: "보건소" },
    { name: "산청군보건의료원", address: "경남 산청군 산청읍 중앙로 97", phone: "", category: "보건소" },
    { name: "양산시보건소", address: "경남 양산시 중앙로 7-32", phone: "", category: "보건소" },
    { name: "의령군보건소", address: "경남 의령군 의령읍 의병로 8길 16", phone: "", category: "보건소" },
    { name: "진주시보건소", address: "경남 진주시 문산읍 월아산로 983", phone: "", category: "보건소" },
    { name: "창녕군보건소", address: "경남 창녕군 창녕읍 우포2로 1189-35", phone: "", category: "보건소" },
    { name: "창원시보건소", address: "경남 창원시 성산구 중앙대로162번안길 8", phone: "", category: "보건소" },
    { name: "창원시마산보건소", address: "경남 창원시 마산합포구 월영동북로 15", phone: "", category: "보건소" },
    { name: "창원시진해보건소", address: "경남 창원시 진해구 중원동로 62", phone: "", category: "보건소" },
    { name: "통영시보건소", address: "경남 통영시 안개4길 108", phone: "", category: "보건소" },
    { name: "하동군보건소", address: "경남 하동군 하동읍 군청로 31", phone: "", category: "보건소" },
    { name: "함안군보건소", address: "경남 함안군 가야읍 중앙남4길 10", phone: "", category: "보건소" },
    { name: "함양군보건소", address: "경남 함양군 함양읍 한들로 141", phone: "", category: "보건소" },
    { name: "합천군보건소", address: "경남 합천군 합천읍 동서로 39", phone: "", category: "보건소" },

    // 경찰서 (주요)
    { name: "경남경찰청", address: "경상남도 창원시 의창구 상남로 289", phone: "", category: "경찰서" },
    { name: "창원중부경찰서", address: "경상남도 창원시 의창구 상남로 177", phone: "", category: "경찰서" },
    { name: "창원서부경찰서", address: "경상남도 창원시 의창구 우곡로 10", phone: "", category: "경찰서" },
    { name: "마산중부경찰서", address: "경상남도 창원시 마산합포구 3.15대로 147", phone: "", category: "경찰서" },
    { name: "진주경찰서", address: "경상남도 진주시 비봉로24번길 3", phone: "", category: "경찰서" },
    { name: "진해경찰서", address: "경상남도 창원시 진해구 진해대로 815", phone: "", category: "경찰서" },
    { name: "통영경찰서", address: "경상남도 통영시 광도면 죽림3로 53", phone: "", category: "경찰서" },
    { name: "사천경찰서", address: "경상남도 사천시 남일로 37", phone: "", category: "경찰서" },
    { name: "밀양경찰서", address: "경상남도 밀양시 상남면 밀양대로 1545", phone: "", category: "경찰서" },
    { name: "김해중부경찰서", address: "경상남도 김해시 김해대로 2307", phone: "", category: "경찰서" },
    { name: "거제경찰서", address: "경상남도 거제시 진목1길 2", phone: "", category: "경찰서" },
    { name: "양산경찰서", address: "경상남도 양산시 물금읍 신주 4길 8", phone: "", category: "경찰서" },
    { name: "거창경찰서", address: "경상남도 거창군 거창읍 중앙로 97", phone: "", category: "경찰서" },
    { name: "합천경찰서", address: "경상남도 합천군 합천읍 황강체육공원로 67", phone: "", category: "경찰서" },
    { name: "창녕경찰서", address: "경상남도 창녕군 창녕읍 종로 38-6", phone: "", category: "경찰서" },
    { name: "함양경찰서", address: "경상남도 함양군 함양읍 학사루길 12", phone: "", category: "경찰서" },

    // 읍·면·동 행정복지센터 (예시 데이터)
    // 남해군
    { name: "남해읍행정복지센터", address: "경상남도 남해군 남해읍 화전로 81", phone: "", category: "행정복지센터" },
    { name: "이동면행정복지센터", address: "경상남도 남해군 이동면 무림로 76", phone: "", category: "행정복지센터" },
    { name: "상주면행정복지센터", address: "경상남도 남해군 상주면 남해대로 705", phone: "", category: "행정복지센터" },
    { name: "삼동면행정복지센터", address: "경상남도 남해군 삼동면 동부대로1876번길 12", phone: "", category: "행정복지센터" },
    { name: "남면행정복지센터", address: "경상남도 남해군 남면 남서대로 778", phone: "", category: "행정복지센터" },

    // 창원시
    { name: "동읍행정복지센터", address: "경상남도 창원시 의창구 동읍 동읍로 88", phone: "", category: "행정복지센터" },
    { name: "북면행정복지센터", address: "경상남도 창원시 의창구 북면 천주로 1085", phone: "", category: "행정복지센터" },
    { name: "대산면행정복지센터", address: "경상남도 창원시 의창구 대산면 가술산단동로 10", phone: "", category: "행정복지센터" },
    { name: "의창동행정복지센터", address: "경상남도 창원시 의창구 서상로12번길 75", phone: "", category: "행정복지센터" },
    { name: "팔룡동행정복지센터", address: "경상남도 창원시 의창구 팔용로 435", phone: "", category: "행정복지센터" },
    { name: "태백동행정복지센터", address: "경상남도 창원시 진해구 중초로9번길 38", phone: "", category: "행정복지센터" },
    { name: "경화동행정복지센터", address: "경상남도 창원시 진해구 경화로8번길 5", phone: "", category: "행정복지센터" },

    // 김해시
    { name: "진영읍행정복지센터", address: "경상남도 김해시 진영읍 여래로20번길 11", phone: "", category: "행정복지센터" },
    { name: "주촌면행정복지센터", address: "경상남도 김해시 주촌면 서부로1368번길 12", phone: "", category: "행정복지센터" },
    { name: "진례면행정복지센터", address: "경상남도 김해시 진례면 진례로 241", phone: "", category: "행정복지센터" },
    { name: "한림면행정복지센터", address: "경상남도 김해시 한림면 한림로 369", phone: "", category: "행정복지센터" },
    { name: "내외동행정복지센터", address: "경상남도 김해시 내외로 67", phone: "", category: "행정복지센터" },
    { name: "북부동행정복지센터", address: "경상남도 김해시 해반천로 160", phone: "", category: "행정복지센터" },

    // 진주시
    { name: "신안동 행정복지센터", address: "경상남도 진주시 진양호로 360", phone: "", category: "행정복지센터" },
    { name: "판문동 행정복지센터", address: "경상남도 진주시 새평거로 55", phone: "", category: "행정복지센터" },
    { name: "성북동 행정복지센터", address: "경상남도 진주시 진주대로1143번길 3", phone: "", category: "행정복지센터" },
    { name: "가호동 행정복지센터", address: "경상남도 진주시 가좌길74번길 9", phone: "", category: "행정복지센터" },
    { name: "천전동 행정복지센터", address: "경상남도 진주시 망경남길44번길 22", phone: "", category: "행정복지센터" }
];

// 2. 전문상담·보호 기관
const specializedData = [
    // 정신건강복지센터
    { name: "경남광역정신건강복지센터", address: "경상남도 창원시 마산회원구 팔용로 262", phone: "", category: "정신건강" },
    { name: "창원시마산정신건강복지센터", address: "창원시 마산합포구 월영동북로 15", phone: "", category: "정신건강" },
    { name: "진주시정신건강복지센터", address: "진주시 문산읍 월아산로 983", phone: "", category: "정신건강" },
    { name: "통영시정신건강복지센터", address: "통영시 안개4길 108", phone: "", category: "정신건강" },
    { name: "사천시정신건강복지센터", address: "사천시 용현면 시청3길 43", phone: "", category: "정신건강" },
    { name: "김해시정신건강복지센터", address: "김해시 주촌면 주선로 29-1", phone: "", category: "정신건강" },

    // 노인보호전문기관
    { name: "경상남도 노인보호전문기관", address: "경상남도 창원시 마산합포구 문화북4길 금강노인복지관", phone: "", category: "노인보호" },
    { name: "경상남도서부 노인보호전문기관", address: "경상남도 진주시 문산읍 월아산로 1098", phone: "", category: "노인보호" },

    // 의료기관 (응급 등)
    { name: "거붕 백병원", address: "경상남도 거제시 계룡로5길 14", phone: "", category: "의료기관" },
    { name: "대우병원", address: "경상남도 거제시 두모길 16", phone: "", category: "의료기관" },
    { name: "맑은샘병원", address: "경상남도 거제시 연초면 거제대로 4477", phone: "", category: "의료기관" },
    { name: "거창적십자병원", address: "경상남도 거창군 거창읍 중앙로 91", phone: "", category: "의료기관" },
    { name: "강병원", address: "경상남도 고성군 고성읍 중앙로 49", phone: "", category: "의료기관" },
    { name: "강일병원", address: "경상남도 김해시 가락로 359", phone: "", category: "의료기관" },
    { name: "조은금강병원", address: "경상남도 김해시 김해대로 1814-37", phone: "", category: "의료기관" },
    { name: "남해병원", address: "경상남도 남해군 남해읍 화전로 169", phone: "", category: "의료기관" },
    { name: "밀양병원", address: "경상남도 밀양시 밀양대로 1823", phone: "", category: "의료기관" },
    { name: "삼천포서울병원", address: "경상남도 사천시 남일로 33", phone: "", category: "의료기관" },
    { name: "양산부산대학교병원", address: "경상남도 양산시 물금읍 금오로 20", phone: "", category: "의료기관" },
    { name: "웅상중앙병원", address: "경상남도 양산시 서창로 59", phone: "", category: "의료기관" },
    { name: "의령병원", address: "경상남도 의령군 의령읍 의병로14길 10", phone: "", category: "의료기관" },
    { name: "창원한마음병원", address: "경상남도 창원시 의창구 용동로57번길 8", phone: "", category: "의료기관" },
    { name: "한일병원", address: "경상남도 진주시 범골로 17", phone: "", category: "의료기관" },
    { name: "삼성합천병원", address: "경상남도 합천군 합천읍 대야로 876", phone: "", category: "의료기관" }
];

fs.writeFileSync(path.join(dataDir, 'public_admin.json'), JSON.stringify(publicAdminData, null, 2));
fs.writeFileSync(path.join(dataDir, 'specialized.json'), JSON.stringify(specializedData, null, 2));

console.log('Created public_admin.json and specialized.json');
