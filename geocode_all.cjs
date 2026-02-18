const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'c009bdf94c2e24ff90aac7521c240536';
const DATA_DIR = path.join(__dirname, 'public', 'data');
const FILES = [
    'fire_stations.json',
    'elderly_care.json',
    'public_admin.json',
    'specialized.json',
    'emergency_hubs.json',
    'regional_welfare.json',
    'private_orgs.json',
];

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Authorization': `KakaoAK ${API_KEY}` } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// 1차: 주소 검색
async function geocodeAddress(address) {
    const json = await httpGet(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`);
    if (json.documents && json.documents.length > 0) {
        return { lat: parseFloat(json.documents[0].y), lng: parseFloat(json.documents[0].x) };
    }
    return null;
}

// 2차: 키워드 검색 (동/면/읍 주소나 기관명으로 fallback)
async function geocodeKeyword(query) {
    const json = await httpGet(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`);
    if (json.documents && json.documents.length > 0) {
        return { lat: parseFloat(json.documents[0].y), lng: parseFloat(json.documents[0].x) };
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFile(filename) {
    const filepath = path.join(DATA_DIR, filename);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    let success = 0, fail = 0;

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.lat && item.lng) {
            success++;
            continue;
        }

        try {
            // 1차: 주소 검색
            let coords = await geocodeAddress(item.address);

            if (!coords) {
                await sleep(50);
                // 2차: 기관명 + 주소 키워드 검색
                coords = await geocodeKeyword(`${item.name} ${item.address}`);
            }

            if (coords) {
                item.lat = coords.lat;
                item.lng = coords.lng;
                success++;
            } else {
                fail++;
                console.log(`  [FAIL] ${item.name}: ${item.address}`);
            }
        } catch (e) {
            fail++;
            console.log(`  [ERROR] ${item.name}: ${e.message}`);
        }

        await sleep(80);

        if ((i + 1) % 100 === 0) {
            console.log(`  ${filename}: ${i + 1}/${data.length} processed...`);
        }
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${filename}: ${success} success, ${fail} fail (total: ${data.length})`);
}

async function main() {
    console.log('Starting geocoding...\n');
    for (const file of FILES) {
        console.log(`Processing ${file}...`);
        await processFile(file);
        console.log('');
    }
    console.log('Done!');
}

main().catch(console.error);
