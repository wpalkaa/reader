import { useState, useEffect, useRef } from 'react';
import 'foliate-js/view.js';

import { getBookStyles } from '@/lib/booksStyles';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Hook zarządzający cyklem życia widoku Foliate (custom element
 * <foliate-view>): otwieranie pliku książki, nawigacja między stronami,
 * śledzenie postępu czytania oraz obsługa klawiatury.
 *
 * Refy (`viewerContainerRef`, `foliateViewRef`, `currentIframeDocRef`) są
 * tworzone i przekazywane przez komponent nadrzędny, dzięki czemu mogą być
 * współdzielone z innymi hookami (np. tłumaczeniem) bez problemu z kolejnością
 * inicjalizacji.
 *
 * @param {object} params
 * @param {File|null} params.bookFile - wybrany przez użytkownika plik .epub
 * @param {'light'|'dark'} params.theme - aktualny motyw, używany do stylowania treści książki
 * @param {React.RefObject} params.viewerContainerRef - kontener DOM, do którego wstrzykiwany jest <foliate-view>
 * @param {React.RefObject} params.foliateViewRef - referencja do instancji <foliate-view>
 * @param {React.RefObject} params.currentIframeDocRef - referencja do dokumentu iframe'a bieżącego rozdziału
 * @param {React.RefObject} params.isTranslateRef - referencja z flaga informujaca czy tlumaczenie jest wlaczone
 * @param {Function} params.translateCurrentChapter - funkcja tlumaczaca z hooka tlumaczenia
 */
export function useFoliateReader({
    bookFile,
    theme,
    viewerContainerRef,
    foliateViewRef,
    currentIframeDocRef,
    isTranslateRef,
    translateCurrentChapter,
}) {
    const [progress, setProgress] = useState('0%');
    const [toc, setToc] = useState([]);
    const saveTimeoutRef = useRef(null);

    const nextPage = () => {
        if (foliateViewRef.current) foliateViewRef.current.next();
    };

    const prevPage = () => {
        if (foliateViewRef.current) foliateViewRef.current.prev();
    };

    const goTo = (href) => {
        if(foliateViewRef.current) {
            foliateViewRef.current.goTo(href)
        }
    }

    // Otwarcie książki i podpięcie listenerów zdarzeń po wybraniu pliku.
    useEffect(() => {
        if (!bookFile || !viewerContainerRef.current) return;

        const viewerContainer = viewerContainerRef.current;
        const view = document.createElement('foliate-view');

        foliateViewRef.current = view;

        viewerContainer.innerHTML = '';
        viewerContainer.appendChild(view);

        view
            .open(bookFile)
            .then( async () => {
                view.renderer.setAttribute('margin', '24px');
                view.renderer.setStyles(getBookStyles(theme));
                view.renderer.setAttribute('max-column-count', '1');

                // Pobieranie spisu treści
                if( view.book && view.book.toc ) {
                    setToc(view.book.toc);
                }

                try {
                    const res = await fetch(`${BACKEND_URL}/api/progress/get`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId: bookFile.name })
                    });
                    const data = await res.json();
                    
                    if (data.location) {
                        view.goTo(data.location);
                    } else {
                        view.goTo(0);
                    }
                } catch (error) {
                    console.error('[Foliate] Błąd podczas pobierania postępu z backendu:', error);
                    view.goTo(0);
                }
            })
            .catch((error) => {
                console.error('[Foliate] Błąd podczas otwierania pliku książki:', error);
                alert('Nie udało się wczytać pliku książki. Upewnij się, że plik .epub nie jest uszkodzony.');
            });

        // Aktualizacja paska postępu czytania na podstawie bieżącej pozycji w książce.
        const handleRelocate = (event) => {
            const fraction = event.detail?.fraction;
            if (typeof fraction === 'number') {
                const read = Math.round(fraction * 100);
                setProgress(`${read}%`);
            }

            // Zapisywanie postępu czytania (CFI) na backendzie z 1-sekundowym opóźnieniem
            const cfi = event.detail?.cfi;
            if (cfi) {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
                saveTimeoutRef.current = setTimeout(() => {
                    fetch(`${BACKEND_URL}/api/progress/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId: bookFile.name, location: cfi })
                    }).catch(err => console.error('[Foliate] Błąd zapisu postępu:', err));
                }, 1000);
            }
        };

        // Zdarzenie 'load' jest emitowane przez Foliate przy każdej zmianie
        // rozdziału (nowy iframe z treścią) – zapisujemy referencję do
        // aktualnego dokumentu i informujemy komponent nadrzędny.
        const handleLoad = (event) => {
            currentIframeDocRef.current = event.detail.doc;
            
            if (isTranslateRef.current) {
                translateCurrentChapter(currentIframeDocRef.current, foliateViewRef.current);
            }
        };

        view.addEventListener('relocate', handleRelocate);
        view.addEventListener('load', handleLoad);

        // Nawigacja stronami za pomocą klawiatury (strzałki oraz A/D).
        const handleKeyDown = (event) => {
            if (!foliateViewRef.current) return;

            const nextKeys = ['ArrowRight', 'd'];
            const prevKeys = ['ArrowLeft', 'a'];

            if (nextKeys.includes(event.key)) {
                nextPage();
            } else if (prevKeys.includes(event.key)) {
                prevPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Clenaup
        return () => {
            view.removeEventListener('relocate', handleRelocate);
            view.removeEventListener('load', handleLoad);
            viewerContainer.innerHTML = '';
            foliateViewRef.current = null;
            currentIframeDocRef.current = null;
            window.removeEventListener('keydown', handleKeyDown);
            if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookFile]);

    // Aktualizacja stylów treści książki przy zmianie motywu (bez przeładowania pliku).
    useEffect(() => {
        if (foliateViewRef.current?.renderer) {
            foliateViewRef.current.renderer.setStyles(getBookStyles(theme));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    return { progress, nextPage, prevPage, toc, goTo };
}