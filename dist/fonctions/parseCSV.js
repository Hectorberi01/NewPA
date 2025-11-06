"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCSVData = exports.parseCSV = void 0;
const stream_1 = require("stream");
const csv_parser_1 = __importDefault(require("csv-parser"));
async function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = stream_1.Readable.from(file.buffer.toString("latin1"));
        stream
            .pipe((0, csv_parser_1.default)({ separator: ";" }))
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", reject);
    });
}
exports.parseCSV = parseCSV;
function validateCSVData(data) {
    // Implement validation logic here
    // For example, check if required fields are present
    return data.every(row => row.name && row.startYear && row.endYear);
}
exports.validateCSVData = validateCSVData;
