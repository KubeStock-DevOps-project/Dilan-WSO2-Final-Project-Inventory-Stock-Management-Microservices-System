const Table = ({
  headers,
  columns,
  data = [],
  renderRow,
  loading,
  emptyMessage = "No data available",
}) => {
  // Support both 'headers' and 'columns' props
  const isColumnMode =
    columns &&
    Array.isArray(columns) &&
    columns.length > 0 &&
    typeof columns[0] === "object";
  const tableHeaders = isColumnMode
    ? columns.map((col) => col.header)
    : headers || [];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-dark-500">Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-500">{emptyMessage}</p>
      </div>
    );
  }

  // Render row for column mode
  const renderColumnRow = (item, index) => (
    <tr key={index}>
      {columns.map((col, colIndex) => (
        <td
          key={colIndex}
          className="px-6 py-4 whitespace-nowrap text-sm text-dark-900"
        >
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-dark-200">
        <thead className="bg-dark-50">
          <tr>
            {tableHeaders.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-dark-200">
          {isColumnMode
            ? data.map((item, index) => renderColumnRow(item, index))
            : data.map((item, index) => renderRow(item, index))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
