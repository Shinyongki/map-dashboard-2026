const fs = require('fs');

const csvPath = 'c:/Projects/map-dashboard-2026/public/data/welfare_facilities.csv';
const outPath = 'c:/Projects/welfare-resource-map-2026/public/data/elderly_care.json';

console.log('Reading CSV from:', csvPath);

try {
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found!');
        process.exit(1);
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n');

    // CSV Header: 연번,시군명,시설명,주소,연락처,...
    // Indices: Name=2, Address=3, Phone=4

    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter that respects quotes
        const matches = [];
        let temp = "";
        let inQuote = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                matches.push(temp);
                temp = "";
            } else {
                temp += char;
            }
        }
        matches.push(temp);

        if (matches.length < 5) continue;

        const name = matches[2];
        const address = matches[3].replace(/"/g, '');
        const phone = matches[4];

        // Filter for "Elderly Customized Care" relevant facilities
        // Keywords: 노인복지센터, 재가, 돌봄, 복지관
        if (name.includes('노인복지센터') || name.includes('재가') || name.includes('돌봄') || name.includes('복지관')) {
            // Exclude nursing homes unless they have specific keywords
            if (name.includes('요양원') && !name.includes('복지센터')) {
                continue;
            }

            result.push({
                name: name,
                address: address,
                phone: phone,
                category: '노인맞춤돌봄'
            });
        }
    }

    // Ensure directory exists
    const dir = outPath.substring(0, outPath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Success! Converted ${result.length} records to ${outPath}`);

} catch (err) {
    console.error('Error:', err);
}
