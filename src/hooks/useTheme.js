import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * Hook zarządzający motywem (jasny/ciemny) aplikacji.
 * Wybrany motyw jest zapisywany w localStorage oraz synchronizowany
 * z klasą `dark` na elemencie <html>, dzięki czemu warianty Tailwind
 * (`dark:...`) działają poprawnie w całej aplikacji.
 */
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (savedTheme) return savedTheme;

        // Brak zapisanej preferencji – korzystamy z ustawień systemowych.
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    return { theme, toggleTheme };
}
