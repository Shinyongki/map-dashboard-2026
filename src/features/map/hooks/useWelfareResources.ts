import { useQuery } from '@tanstack/react-query';

export interface WelfareFacility {
    id: number;
    region: string;
    name: string;
    address: string;
    phone: string;
    capacity: number;
    operatorType: string;
    establishedDate: string;
}

const fetchWelfareResources = async (): Promise<WelfareFacility[]> => {
    try {
        const response = await fetch('/data/welfare_facilities.csv');
        if (!response.ok) {
            throw new Error('Failed to fetch welfare resources CSV');
        }
        const text = await response.text();

        // CSV Parsing (assuming header row exists and format is consistent)
        // Header: 연번,시군명,시설명,주소,연락처,시설인원,운영주체,시설설치일
        const lines = text.split('\n');
        const data: WelfareFacility[] = [];

        // Skip header (index 0) and process each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle potential comma within quoted fields (simple logic, refine if needed)
            // But looking at the file, quotes are used.
            // Let's use a simple regex for CSV parsing if possible or just split if simple.
            // The file has quotes for addresses with commas. e.g. "경상남도... (동읍, 자비마을)"

            const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            // Actually simpler: stick to a basic CSV parser or use a library if available.
            // Since we want to avoid deps, let's write a small parser.

            const values: string[] = [];
            let currentValue = '';
            let insideQuotes = false;

            for (let char of line) {
                if (char === '"') {
                    insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                    values.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue.trim()); // Push last value

            if (values.length >= 8) {
                data.push({
                    id: parseInt(values[0]) || i,
                    region: values[1],
                    name: values[2],
                    address: values[3].replace(/^"|"$/g, ''), // Remove surrounding quotes
                    phone: values[4],
                    capacity: parseInt(values[5]) || 0,
                    operatorType: values[6],
                    establishedDate: values[7]
                });
            }
        }
        return data;
    } catch (error) {
        console.error("Error loading welfare resources:", error);
        return [];
    }
};

export function useWelfareResources() {
    return useQuery({
        queryKey: ['welfare-resources'],
        queryFn: fetchWelfareResources,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
