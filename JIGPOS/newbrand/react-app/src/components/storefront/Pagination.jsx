// P38 — Pagination: prev/next + page numbers, vanilla-matched
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-4 py-2 text-sm font-medium bg-white border border-jig-purple-light rounded-[5px] text-white hover:bg-jig-purple hover:text-gray-100 hover:border-jig-purple disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Prev
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 py-2 text-sm text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-4 py-2 text-sm font-medium rounded-[5px] border transition-all ${
              p === currentPage
                ? 'bg-jig-purple text-gray-100 border-jig-purple'
                : 'bg-white text-white border-jig-purple-light hover:bg-jig-purple hover:text-gray-100 hover:border-jig-purple'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-4 py-2 text-sm font-medium bg-white border border-jig-purple-light rounded-[5px] text-white hover:bg-jig-purple hover:text-gray-100 hover:border-jig-purple disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Next
      </button>
    </div>
  );
}
