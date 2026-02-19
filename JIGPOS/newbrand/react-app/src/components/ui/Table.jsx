import { useState, useMemo } from 'react';

export default function Table({ columns = [], data = [], searchable = false, paginated = false, pageSize = 10, onRowClick }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  // Filter
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.accessor ? row[col.accessor] : '';
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = paginated ? Math.ceil(sorted.length / pageSize) : 1;
  const rows = paginated ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  function handleSort(accessor) {
    if (!accessor) return;
    if (sortKey === accessor) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(accessor);
      setSortDir('asc');
    }
  }

  return (
    <div>
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search..."
            className="w-full sm:w-72 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-jig-amber focus:shadow-[0_0_0_4px_rgba(124,58,237,0.15)] font-body"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                  className={`
                    bg-jig-purple px-4 py-3.5 text-left text-gray-100 text-sm font-semibold
                    border-b-2 border-jig-amber
                    ${col.accessor && col.sortable !== false ? 'cursor-pointer select-none hover:bg-jig-purple-dark' : ''}
                  `}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {sortKey === col.accessor && (
                      <span className="text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-gray-400 text-sm">
                  No data found.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b border-gray-100 transition-colors
                    hover:bg-[rgba(212,175,55,0.08)]
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((col) => (
                    <td key={col.accessor || col.header} className="px-4 py-3.5 text-sm text-white">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-jig-amber transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-jig-amber transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
