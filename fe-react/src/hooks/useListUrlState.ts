import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import dayjs from 'dayjs';

export interface ListUrlState {
    keyword: string | undefined;
    status: string | undefined;
    dateStart: string | undefined;
    dateEnd: string | undefined;
    page: number;
    pageSize: number;
}

export const useListUrlState = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse current URL state into a structured object
    const urlState = useMemo<ListUrlState>(() => {
        return {
            keyword: searchParams.get('keyword') || undefined,
            status: searchParams.get('status') || undefined,
            dateStart: searchParams.get('dateStart') || undefined,
            dateEnd: searchParams.get('dateEnd') || undefined,
            page: Number(searchParams.get('page')) || 1,
            pageSize: Number(searchParams.get('pageSize')) || 10,
        };
    }, [searchParams]);

    // Helper to push updates to the URL cleanly (replaces current history entry)
    const updateUrlState = useCallback((updates: Partial<ListUrlState>) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Initial values for AntD Form – prevents flicker on first render
    const formInitialValues = useMemo(() => {
        const vals: Record<string, any> = {
            keyword: urlState.keyword,
            status: urlState.status,
        };
        if (urlState.dateStart && urlState.dateEnd) {
            vals.dateRange = [dayjs(urlState.dateStart), dayjs(urlState.dateEnd)];
        }
        return vals;
    }, []); // intentionally empty deps – runs ONCE at mount to seed initialValues

    return {
        searchParams,
        setSearchParams,
        urlState,
        updateUrlState,
        formInitialValues,
    };
};
