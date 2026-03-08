import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Edit, Trash2, Search, Filter } from 'lucide-react';

const DataTable = ({
    columns,
    data,
    onEdit,
    onDelete,
    onSearch,
    searchPlaceholder = "Search...",
    actions = true,
    loading = false,
    emptyMessage = "No data available.",
    pageSize = 10
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when data changes
    const allData = data || [];
    const totalItems = allData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Clamp current page
    const safePage = Math.min(currentPage, totalPages);
    if (safePage !== currentPage) setCurrentPage(safePage);

    const paginatedData = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return allData.slice(start, start + pageSize);
    }, [allData, safePage, pageSize]);

    const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endItem = Math.min(safePage * pageSize, totalItems);

    const handleSearchChange = (value) => {
        setCurrentPage(1);
        if (onSearch) onSearch(value);
    };

    // Generate page numbers with ellipses
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push('...');
            const start = Math.max(2, safePage - 1);
            const end = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {onSearch && (
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="input-field pl-10 h-10 text-sm"
                            placeholder={searchPlaceholder}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent shadow-sm bg-white">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    scope="col"
                                    className={`px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider relative">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
                                        Loading data...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex} className="hover:bg-slate-50 transition-colors duration-150">
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 ${col.cellClassName || ''}`}>
                                            {col.render ? col.render(row) : row[col.accessor]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(row)}
                                                        className="p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(row)}
                                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {totalItems > 0 && (
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalItems}</span> results
                            </p>
                        </div>
                        {totalPages > 1 && (
                            <nav className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {getPageNumbers().map((pg, i) => (
                                    pg === '...' ? (
                                        <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                                    ) : (
                                        <button
                                            key={pg}
                                            onClick={() => setCurrentPage(pg)}
                                            className={`min-w-[32px] h-8 text-sm font-medium rounded-md transition-colors ${pg === safePage
                                                    ? 'bg-brand-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
                                                }`}
                                        >
                                            {pg}
                                        </button>
                                    )
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
