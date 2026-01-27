export type CsvColumn<T> = {
    key: keyof T;
    header: string;
};

function escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[\n\r",]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
    const header = columns.map((col) => escapeCsvValue(col.header)).join(",");
    const lines = rows.map((row) =>
        columns.map((col) => escapeCsvValue(row[col.key])).join(",")
    );

    return [header, ...lines].join("\n");
}
