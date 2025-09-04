import { Readable } from "stream";
import csvParser from "csv-parser";

export async function parseCSV(file: Express.Multer.File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from(file.buffer.toString("latin1"));

        stream
            .pipe(csvParser({ separator: ";" }))
            .on("data", (data:any) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", reject);
    });      
}

export function validateCSVData(data: any[]): boolean {
    // Implement validation logic here
    // For example, check if required fields are present
    return data.every(row => row.name && row.startYear && row.endYear);
}