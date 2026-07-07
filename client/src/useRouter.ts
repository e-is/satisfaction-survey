// client/src/useRouter.ts
// License: AGPL-3.0-only
import { useState, useEffect } from 'react';

export function useRouter() {
    const [path, setPath] = useState(window.location.pathname);

    useEffect(() => {
        const handlePopState = () => {
            setPath(window.location.pathname);
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const navigate = (to: string) => {
        window.history.pushState({}, '', to);
        setPath(to);
    };

    return { path, navigate };
}
