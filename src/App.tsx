import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

import ePub from 'epubjs';
import LightModeToggle from './components/LightModeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

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
    
    // Epub section
    const [book, setBook] = useState<ePub.Book | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);

    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<ePub.Rendition | null>(null);

    const handleSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
        if( event.target.files && event.target.files.length > 0) {
            const file: File = event.target.files[0];

            try {
                const arrayBuffer = await file.arrayBuffer();
                const newBook = ePub(arrayBuffer);
                setBook(newBook);
            } catch (error) {
                alert("Błąd wczytania pliku");
                console.error("Błąd wczytania pliku:", error);
            }
        }
    }

    // Book rendering
    useEffect(() => {
        // Flaga chroniąca przed podwójnym wywołaniem w React Strict Mode
        let isMounted = true; 

        if (book && viewerRef.current) {
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                spread: 'none',
            });
            
            rendition.display();
            renditionRef.current = rendition;
            console.log("Book instance: ", book);
            console.log("Rendition: ", rendition)

            book.ready
                .then(() => {
                    console.log("Rozpoczęto generowanie lokacji (to może chwilę potrwać)...");
                    return book.locations.generate(1024);
                })
                .then(() => {
                    // Aktualizuj stan tylko jeśli komponent wciąż jest zamontowany
                    if (isMounted) { 
                        const total = book.locations.length();
                        setTotalPages(total);
                        console.log("total: ", total);
                    }
                })
                .catch((error) => {
                    // Złapanie błędów, jeśli epub.js napotka problem
                    console.error("Błąd podczas generowania lokacji:", error);
                });

            return () => {
                isMounted = false; // Zapobiega memory leaks (wyciekom pamięci) przy aktualizacji stanu
                rendition.destroy();
            }
        }
    }, [book]);

    const nextPage = () => {
        if (renditionRef.current) {
            renditionRef.current.next();
            console.log(renditionRef.current)
            console.log(book)
        }
    }
    const prevPage = () => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    }

    return (
        <div className="relative bg-bg-primary text-text-primary min-h-screen transition-colors duration-300 flex justify-center py-10">
            <LightModeToggle theme={theme} toggleTheme={toggleTheme} />

            {!book 
            ? <div className="flex flex-col gap-2 justify-center mb-30 w-[40vw] items-center">
                <label className="text-2xl font-bold">{book ? 'Zmień książkę' : 'Wybierz książkę'}:</label>
                <input type='file' accept='.epub' required  onChange={handleSelectFile}
                    className="file:border file:border-green-500">
                </input>
            </div>
            : <div className="flex flex-col gap-1 items-center">
                <div ref={viewerRef} className="w-[60vw] h-[80vh] border border-b-amber-200/80 rounded-lg"></div>
                
                <div className="flex gap-2 justify-center">
                    <button onClick={prevPage}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <div>{book?.locations?.length()}</div>
                    <button onClick={nextPage}><FontAwesomeIcon icon={faChevronRight} /></button>
                </div>
            </div>
            }

        </div>
    )
}

export default App;
