import { useState, useRef } from 'react';
import './App.css';

import { useTheme } from '@/hooks/useTheme';
import { useBookTranslation } from '@/hooks/useBookTranslation';
import { useFoliateReader } from '@/hooks/useFoliateReader';

import LightModeToggle from '@/components/LightModeToggle';
import FileUploadScreen from '@/components/FileUploadScreen';
import BookViewer from '@/components/BookViewer';

function App() {
    const { theme, toggleTheme } = useTheme();

    const [bookFile, setBookFile] = useState(null);

    const viewerContainerRef = useRef(null);
    const foliateViewRef = useRef(null);
    const currentIframeDocRef = useRef(null);

    const {
        isTranslate,
        isTranslating,
        isTranslateRef,
        toggleTranslation,
        translateCurrentChapter,
    } = useBookTranslation();

    // Dodano odbiór 'toc' i 'goTo'
    const { progress, nextPage, prevPage, toc, goTo } = useFoliateReader({
        bookFile,
        theme,
        viewerContainerRef,
        foliateViewRef,
        currentIframeDocRef,
        isTranslateRef,
        translateCurrentChapter,
    });

    const handleToggleTranslation = () => {
        toggleTranslation(currentIframeDocRef.current, foliateViewRef.current);
    };

    return (
        <div className="relative bg-bg-primary text-text-primary min-h-screen transition-colors duration-300 flex flex-col items-center py-10">
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
                    toc={toc}          // Przekazanie właściwości z hooka
                    goTo={goTo}      // Przekazanie funkcji nawigacji
                />
            )}
        </div>
    );
}

export default App;