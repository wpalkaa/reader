import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faList } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

import Sidebar from '@/components/Sidebar'; 

/**
 * Widok czytnika książki: kontener na <foliate-view>, pasek postępu,
 * nawigacja stronami oraz przycisk włączania/wyłączania tłumaczenia.
 *
 * @param {React.RefObject} viewerContainerRef - kontener DOM dla <foliate-view>
 * @param {string} progress - procentowy postęp czytania, np. "42%"
 * @param {() => void} onPrevPage
 * @param {() => void} onNextPage
 * @param {boolean} isTranslate - czy tryb tłumaczenia jest włączony
 * @param {boolean} isTranslating - czy trwa aktualnie tłumaczenie rozdziału
 * @param {() => void} onToggleTranslation
 */
export default function BookViewer({
    viewerContainerRef,
    progress,
    onPrevPage,
    onNextPage,
    isTranslate,
    isTranslating,
    onToggleTranslation,
    toc,
    goTo,
}) {

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col gap-1 items-center">
            {/* Przycisk Menu (Spis treści) na górze lub z boku czytnika */}
            <div className="w-[60vw] flex justify-start mb-2">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center gap-2 p-2 hover:text-green-500 transition-colors font-semibold"
                >
                    <FontAwesomeIcon icon={faList} />
                    <span>Spis treści</span>
                </button>
            </div>

            {/* Sidebar Komponent */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                toc={toc} 
                onNavigate={goTo} 
            />

            {/* Kontener, do którego Foliate wstrzykuje element <foliate-view> */}
            <div
                ref={viewerContainerRef}
                className="relative w-[60vw] h-[80vh] border border-amber-200 rounded-lg bg-bg-secondary transition-colors duration-300 text-white"
            />

            {/* Nawigacja stronami i postęp czytania */}
            <div className="flex gap-4 mt-2 justify-center items-center">
                <button onClick={onPrevPage} className="p-2 hover:text-green-500 transition-colors">
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="font-semibold min-w-12 text-center">{progress}</div>

                <button onClick={onNextPage} className="p-2 hover:text-green-500 transition-colors">
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>

            {/* Przełącznik tłumaczenia */}
            <div className="flex justify-center items-center p-1">
                <button onClick={onToggleTranslation} disabled={isTranslating}>
                    {isTranslating
                        ? 'Tłumaczenie…'
                        : isTranslate
                          ? 'Wyłącz tłumaczenie'
                          : 'Przetłumacz'}
                </button>
            </div>
        </div>
    );
}
