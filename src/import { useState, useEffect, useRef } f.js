import { useState, useEffect, useRef } from 'react'
import './App.css'

import 'foliate-js/view.js'
import { buildPrompt } from "./lib/buildPrompt";

import LightModeToggle from './components/LightModeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { GoogleGenAI, Type } from '@google/genai';

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

    // Foliate Iframe ref of current chapter
    const currentIframeDocRef = useRef(null);

    const [isTranslate, setIsTranslate] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

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

    const toggleTranslation = () => {
        setIsTranslate(prevState => {
            const newState = !prevState;
            if (newState) {
                translateCurrentChapter();
            }
            return newState;
        });
    }

    // Translate chapter function
    const translateCurrentChapter = async () => {
        const doc = currentIframeDocRef.current;
        const view = foliateViewRef.current;

        if( !doc || !view ) {
            console.error("Brak książki do przetłumaczenia");
            return;
        }

        const blockElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
        const elementsToTranslate = [];
        const htmlToSend = [];

        blockElements.forEach(el => {
            if (el.textContent && el.textContent.trim() !== '') {
                elementsToTranslate.push(el);
                htmlToSend.push(el.innerHTML);
            }
        });

        if (htmlToSend.length === 0) {
            alert("Did not find any text to translate.");
            toggleTranslation();
            return;
        }

        try {
            setIsTranslating(true);

            const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
            const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
            
            const batchSize = 200; 
            let finalTranslatedTexts = [];

            for (let i = 0; i < htmlToSend.length; i += batchSize) {
                const chunk = htmlToSend.slice(i, i + batchSize);
                
                const chunkWithIds = chunk.map((text, idx) => ({ 
                    id: i + idx, 
                    text: text 
                }));

                const response = await ai.models.generateContent({
                    model: "gemini-3.5-flash-lite",
                    contents: buildPrompt(JSON.stringify(chunkWithIds)),
                    config: {
                        temperature: 0.1, 
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    text: { type: Type.STRING }
                                },
                                required: ["id", "text"]
                            },
                        },
                    },
                });

                const translatedChunk = JSON.parse(response.text);
                
                translatedChunk.sort((a, b) => a.id - b.id);

                translatedChunk.forEach(item => {
                    finalTranslatedTexts.push(item.text);
                });
            }

            if(finalTranslatedTexts.length !== htmlToSend.length) {
                console.error(`Niezgodność liczby elementów: Wysłano ${htmlToSend.length}, otrzymano ${finalTranslatedTexts.length}`);
                return;
            }

            elementsToTranslate.forEach((el, index) => {
                el.innerHTML = finalTranslatedTexts[index]; 
            });

            if (typeof view.layout === 'function') {
                view.layout();
            }

        } catch (error) {
            console.error("Wystąpił błąd podczas tłumaczenia rozdziału:", error);
        } finally {
            setIsTranslating(false);
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

            // Total read function
            const handleRelocate = (event) => {
                console.log("rel:", event.detail)
                console.log("reloacte.range: ", event.detail.range);
                const fraction = event.detail?.fraction;
                if (typeof fraction === 'number') {
                    const percent = Math.round(fraction * 100);
                    setProgress(`${percent}%`);
                }
            };

            // Event 'load' takes place when foliate creates new iframe (new chapter)
            const handleLoad = (event) => {
                currentIframeDocRef.current = event.detail.doc;
                console.log("[DEBUG]: currentIframeDocRef = ", currentIframeDocRef.current);

                if( isTranslateRef.current ) {
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
    }, [bookFile]);

    // Change styles on page style change
    useEffect(() => {
        if (foliateViewRef.current && foliateViewRef.current.renderer) {
            foliateViewRef.current.renderer.setStyles(getBookStyles(theme));
        }
    }, [theme]);
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
                <div className="flex justify-center items-center p-1>">
                    <button onClick={toggleTranslation}>{isTranslate ? "Wyłącz tłumaczenie" : "Przetłumacz"}</button>
                </div>
            </div>
            }
        </div>
    )
}

export default App;