import { useState, useRef } from 'react';
import './App.css';

import { useTheme } from '@/hooks/useTheme';
import { useBookTranslation } from '@/hooks/useBookTranslation';
import { useFoliateReader } from '@/hooks/useFoliateReader';
import { getChapterId } from '@/lib/chapterId';

import LightModeToggle from '@/components/LightModeToggle';
import FileUploadScreen from '@/components/FileUploadScreen';
import BookViewer from '@/components/BookViewer';

function App() {
    const { theme, toggleTheme } = useTheme();

    // Aktualnie wybrany plik książki (null = brak wczytanej książki).
    const [bookFile, setBookFile] = useState(null);

    // Refy Foliate współdzielone między hookiem czytnika a hookiem tłumaczenia.
    const viewerContainerRef = useRef(null);
    const foliateViewRef = useRef(null);
    const currentIframeDocRef = useRef(null);

    // Identyfikator aktualnie wyświetlanego rozdziału – używany jako klucz
    // pliku w cache tłumaczeń (zobacz lib/bookCache.js i lib/chapterId.js).
    const currentChapterIdRef = useRef(null);

    const {
        isTranslate,
        isTranslating,
        isTranslateRef,
        toggleTranslation,
        translateCurrentChapter,
    } = useBookTranslation();

    // Przy każdej zmianie rozdziału zapisujemy jego identyfikator, a jeśli
    // tryb tłumaczenia jest włączony – od razu tłumaczymy nową treść
    // (korzystając z cache, jeśli rozdział był już wcześniej przetłumaczony).
    const handleChapterLoad = (event) => {
        currentChapterIdRef.current = getChapterId(event);

        if (isTranslateRef.current) {
            translateCurrentChapter(currentIframeDocRef.current, foliateViewRef.current, {
                bookFileName: bookFile?.name,
                chapterId: currentChapterIdRef.current,
            });
        }
    };

    const { progress, nextPage, prevPage } = useFoliateReader({
        bookFile,
        theme,
        viewerContainerRef,
        foliateViewRef,
        currentIframeDocRef,
        onChapterLoad: handleChapterLoad,
    });

    const handleToggleTranslation = () => {
        toggleTranslation(currentIframeDocRef.current, foliateViewRef.current, {
            bookFileName: bookFile?.name,
            chapterId: currentChapterIdRef.current,
        });
    };

    return (
        <div className="relative bg-bg-primary text-text-primary min-h-screen transition-colors duration-300 flex justify-center py-10">
            <LightModeToggle theme={theme} toggleTheme={toggleTheme} />

            {!bookFile ? (
                <FileUploadScreen onSelectFile={setBookFile} />
            ) : (
                <BookViewer
                    viewerContainerRef={viewerContainerRef}
                    progress={progress}
                    onPrevPage={prevPage}
                    onNextPage={nextPage}
                    isTranslate={isTranslate}
                    isTranslating={isTranslating}
                    onToggleTranslation={handleToggleTranslation}
                />
            )}
        </div>
    );
}

export default App;
