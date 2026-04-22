import React from 'react';
interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}
interface Props<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
}
export default function Table<T>({ data, columns, className = '' }: Props<T>) {
  return (
    <div className={`overflow-x-auto ${className}`}>;
    <table className="min-w-full text-sm text-left text-gray-200">
      <thead className="bg-gray-800/60">
        <tr>
          {columns.map((col, i) => (
            <th key={i} className={`px-4 py-2 ${col.className || ''}`}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="border-b border-gray-700/30 hover:bg-gray-700/30">
            {columns.map((col, i) => (
              <td key={i} className={`px-4 py-2 ${col.className || ''}`}>{col.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
