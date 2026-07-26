import { useState, useEffect, useRef } from 'react'
import './App.css'

import 'foliate-js/view.js'

import LightModeToggle from './components/LightModeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faSpinner } from '@fortawesome/free-solid-svg-icons';

function App() {
    // Dark/Light mode 
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' 
    });

    useEffect(() => {
        const root = document.documentElement;
        if( theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => prevTheme === 'dark' ? 'light' : 'dark');
    }
    
    // Foliate-js section
    const [bookFile, setBookFile] = useState(null);
    const [progress, setProgress] = useState("0%");

    const viewerContainerRef = useRef(null);
    const foliateViewRef = useRef(null); 
    
    // Referencja do dokumentu aktualnego rozdziału wewnątrz iframe Foliate
    const currentIframeDocRef = useRef(null);

    // Stany dla tłumaczenia
    const [isTranslate, setIsTranslate] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    
    // Używamy useRef dla flagi isTranslate, by mieć do niej najświeższy dostęp w event listenerach
    const isTranslateRef = useRef(isTranslate);
    useEffect(() => {
        isTranslateRef.current = isTranslate;
    }, [isTranslate]);

    const handleSelectFile = (event) => {
        if( event.target.files && event.target.files.length > 0) {
            setBookFile(event.target.files[0]);
        }
    }

    // Book rendering
    const nextPage = () => {
        if (foliateViewRef.current) foliateViewRef.current.next();
    }
    const prevPage = () => {
        if (foliateViewRef.current) foliateViewRef.current.prev();
    }

    const getBookStyles = (currentTheme) => {
        if( currentTheme === 'dark' ) {
            return `
                p, li, div, h1, h2, h3, h4, h5, h6 {
                    color: #ffffff;
                }
            `;
        } else {
            return `
                p, li, div, h1, h2, h3, h4, h5, h6 {
                    color: black;
                }
            `;
        }
    }

    useEffect(() => {
        if (bookFile && viewerContainerRef.current) {
            const viewerContainer = viewerContainerRef.current;
            const view = document.createElement('foliate-view');

            foliateViewRef.current = view;

            viewerContainer.innerHTML = '';
            viewerContainer.appendChild(view);
            
            view.open(bookFile)
                .then(() => {
                    view.renderer.setAttribute('margin', '24px');
                    view.renderer.setStyles(getBookStyles(theme));
                    view.renderer.setAttribute('max-column-count', '1');
                    view.goTo(0)
                })
                .catch((error) => {
                    alert("Błąd wczytania pliku");
                    console.error("Błąd ładowania książki przez Foliate:", error);
                });

            // Tracking progress
            const handleRelocate = (event) => {
                const fraction = event.detail?.fraction;
                if (typeof fraction === 'number') {
                    const percent = Math.round(fraction * 100);
                    setProgress(`${percent}%`);
                }
            };

            // Event 'load' wyzwalany jest przez foliate-js kiedy nowy iframe (rozdział) zostanie wczytany
            const handleLoad = (event) => {
                currentIframeDocRef.current = event.detail.doc;
                
                // Jeśli tłumaczenie jest włączone, tłumaczymy nowy rozdział od razu po jego wczytaniu
                if (isTranslateRef.current) {
                    translateCurrentChapter();
                }
            };

            view.addEventListener('relocate', handleRelocate);
            view.addEventListener('load', handleLoad);

            // Next/Prev page with keyboard
            const handleKeyDown = (event) => {
                if(!foliateViewRef.current) return;
                
                const nextKeys = ['ArrowRight', 'd'];
                const prevKeys = ['ArrowLeft', 'a'];

                if (nextKeys.includes(event.key)) {
                    nextPage();
                } else if (prevKeys.includes(event.key)) {
                    prevPage();
                }
            }

            window.addEventListener('keydown', handleKeyDown);
            
            return () => {
                view.removeEventListener('relocate', handleRelocate);
                view.removeEventListener('load', handleLoad);
                viewerContainer.innerHTML = '';
                foliateViewRef.current = null;
                currentIframeDocRef.current = null;
                window.removeEventListener('keydown', handleKeyDown);
            }
        }
    }, [bookFile]); // Usunięto theme, żeby książka nie restartowała się przy zmianie motywu

    // Zmiana stylów po przełączeniu motywu
    useEffect(() => {
        if (foliateViewRef.current && foliateViewRef.current.renderer) {
            foliateViewRef.current.renderer.setStyles(getBookStyles(theme));
        }
    }, [theme]);

    /**
     * Główna funkcja Tłumacząca węzły
     */
    const translateCurrentChapter = async () => {
        const doc = currentIframeDocRef.current;
        const view = foliateViewRef.current;

        if (!doc || !view) {
            console.error("Brak załadowanego dokumentu do przetłumaczenia.");
            return;
        }

        const body = doc.body;
        const textNodes = [];
        const textsToSend = [];

        // 1. Ekstrakcja węzłów tekstowych przy pomocy TreeWalker
        const walker = doc.createTreeWalker(
            body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue || node.nodeValue.trim() === '') return NodeFilter.FILTER_REJECT;
                    
                    const parent = node.parentElement;
                    if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE'].includes(parent.tagName.toUpperCase())) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let currentNode;
        while ((currentNode = walker.nextNode())) {
            textNodes.push(currentNode);
            textsToSend.push(currentNode.nodeValue);
        }

        if (textsToSend.length === 0) return;

        try {
            setIsTranslating(true);

            // -----------------------------------------------------
            // TUTAJ PODMIEŃ NA SWOJE PRAWDZIWE ZAPYTANIE DO API
            // -----------------------------------------------------
            /*
            const response = await fetch('https://twoje-api.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: textsToSend, targetLang: 'pl' })
            });
            const data = await response.json();
            const translatedTexts = data.translatedTexts; 
            */

            // Tymczasowy MOCK API symulujący opóźnienie i działanie.
            // Dopisuje "[PL]" do początku każdego zdania żebyś widział efekt.
            const translatedTexts = await new Promise(resolve => 
                setTimeout(() => resolve(textsToSend.map(t => `[PL] ${t}`)), 1500)
            );
            // -----------------------------------------------------

            if (!translatedTexts || translatedTexts.length !== textNodes.length) {
                throw new Error("Odpowiedź API nie pokrywa się z liczbą wysłanych węzłów.");
            }

            // 2. Bezpieczna podmiana tekstów
            textNodes.forEach((node, index) => {
                node.nodeValue = translatedTexts[index];
            });

            // 3. Wymuszenie przeliczenia układu (tekst zmienił rozmiar)
            if (typeof view.layout === 'function') {
                view.layout();
            } else {
                // Alternatywny fallback dla przeliczenia layoutu
                window.dispatchEvent(new Event('resize'));
            }

        } catch (error) {
            console.error("Wystąpił błąd podczas tłumaczenia rozdziału:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const toggleTranslation = () => {
        setIsTranslate(prevState => {
            const newState = !prevState;
            // Jeśli użytkownik aktywuje tłumaczenie, tłumacz od razu obecny ekran
            if (newState) {
                translateCurrentChapter();
            } 
            // Jeżeli wyłącza, mógłbyś przeładować dokument, ale wymagałoby to zapamiętywania oryginału
            // Na teraz po prostu przerywamy tłumaczenie dla kolejnych rozdziałów.
            return newState;
        });
    }

    return (
        <div className="relative bg-bg-primary text-text-primary min-h-screen transition-colors duration-300 flex justify-center py-10">
            <LightModeToggle theme={theme} toggleTheme={toggleTheme} />

            {!bookFile 
            ? <div className="flex flex-col gap-2 justify-center mb-30 w-[40vw] items-center">
                <label className="text-2xl font-bold">Wybierz książkę:</label>
                <input type='file' accept='.epub' required onChange={handleSelectFile}
                    className="file:border file:border-green-500">
                </input>
            </div>
            : <div className="flex flex-col gap-1 items-center">
                
                {/* Opcjonalny wskaźnik ładowania podczas tłumaczenia */}
                {isTranslating && (
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        Trwa tłumaczenie przez AI...
                    </div>
                )}

                {/* viewer */}
                <div 
                    ref={viewerContainerRef} 
                    className="relative w-[60vw] h-[80vh] border border-amber-200 rounded-lg bg-bg-secondary transition-colors duration-300 text-white"
                ></div>
                
                {/* Buttons section */}
                <div className="flex gap-4 mt-2 justify-center items-center">
                    <button onClick={prevPage} className="p-2 hover:text-green-500 transition-colors">
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    
                    <div className="font-semibold min-w-[3rem] text-center">{progress}</div>
                    
                    <button onClick={nextPage} className="p-2 hover:text-green-500 transition-colors">
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>

                <div className="flex justify-center items-center p-1 mt-4">
                    <button 
                        onClick={toggleTranslation}
                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${
                            isTranslate 
                                ? "bg-red-500 hover:bg-red-600 text-white" 
                                : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                    >
                        {isTranslate ? "Wyłącz tłumaczenie" : "Przetłumacz na żywo"}
                    </button>
                </div>
            </div>
            }
        </div>
    )
}

export default App;