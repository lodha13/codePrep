import React from 'react';
import { Button } from './button';

interface Props {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (p: number) => void;
    onPageSizeChange?: (s: number) => void;
}

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const getPageWindow = () => {
        const windowSize = 5;
        let start = Math.max(1, page - Math.floor(windowSize / 2));
        let end = Math.min(totalPages, start + windowSize - 1);
        if (end - start + 1 < windowSize) {
            start = Math.max(1, end - windowSize + 1);
        }
        const pages = [];
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={page === 1}>First</Button>
                <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>Prev</Button>
                {getPageWindow().map(p => (
                    <Button key={p} variant={p === page ? 'default' : 'ghost'} size="sm" onClick={() => onPageChange(p)}>
                        {p}
                    </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Next</Button>
                <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>Last</Button>
            </div>
            {onPageSizeChange && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Per page</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="h-8 w-24 rounded border border-input bg-background px-2 text-sm"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            )}
        </div>
    );
}

export default Pagination;
