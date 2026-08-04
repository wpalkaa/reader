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

        const body = doc.body;
        const textNodes = [];
        const textsToSend = [];

        const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.nodeValue || node.nodeValue.trim() === '') return NodeFilter.FILTER_REJECT;
                
                const parent = node.parentElement;
                if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE'].includes(parent.tagName.toUpperCase())) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        })

        let currentNode;
        while ((currentNode = walker.nextNode())) {
            textNodes.push(currentNode);
            textsToSend.push(currentNode.nodeValue);
        }

        if (textsToSend.length === 0) return;
        await console.log(buildPrompt(JSON.stringify(textsToSend)))
        try {
            setIsTranslating(true);

            const apiKeyHard = "";
            const ai = new GoogleGenAI({apiKey: apiKeyHard});

            const response = await ai.models.generateContent({
                model: "gemini-3.5-flash-lite",
                contents: buildPrompt(textsToSend),
                config: {
                    temperature: 0.3,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                },
            });
            const translatedTexts = JSON.parse(response.text);
            console.log("translatedTexts:", translatedTexts)
            // Mock
            // const translatedTexts = await new Promise(resolve => 
            //     setTimeout(() => resolve(textsToSend.map(t => `[PL] ${t} tlumaczone`)), 1500)
            // );

            if (!translatedTexts) {
                throw new Error("Empty result");
            }
            if(translatedTexts.length !== textNodes.length) {
                // throw new Error(`API response does not match send nodes: ${translatedTexts.length}/${textNodes.length}`)
                console.log(`zła ilość elementów: ${translatedTexts.length}/${textNodes.length}`)
            }

            // 2. Replacing text
            textNodes.forEach((node, index) => {
                node.nodeValue = translatedTexts[index];
            });

            // 3. Wymuszenie przeliczenia układu (tekst zmienił rozmiar)
            if (typeof view.layout === 'function') {
                view.layout();
            };

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