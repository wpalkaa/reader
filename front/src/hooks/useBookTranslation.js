import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { buildPrompt } from '@/lib/buildPrompt';
import {
    TRANSLATION_BATCH_SIZE,
    TRANSLATABLE_SELECTOR,
} from '@/lib/constants';
import { savePrevText, getPrevText } from '@/lib/handlePrevText';

const TRANSLATION_MODEL = import.meta.env.VITE_GEMINI_MODEL;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export function useBookTranslation() {
    const [isTranslate, setIsTranslate] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const isTranslateRef = useRef(isTranslate);
    useEffect(() => {
        isTranslateRef.current = isTranslate;
    }, [isTranslate]);

    const translateCurrentChapter = useCallback(async (doc, view) => {
        if (!doc || !view) {
            console.error('[Tłumaczenie] Brak załadowanego rozdziału lub widoku książki – nie można rozpocząć tłumaczenia.');
            return;
        }

        const blockElements = doc.querySelectorAll(TRANSLATABLE_SELECTOR);
        const elementsToTranslate = [];
        const htmlToSend = [];
        const bookTitle = view.book?.metadata?.title || "Nieznana książka";
        console.log("[Debug]: Tytuł książki do tłumaczenia: ", bookTitle);
        console.log("[Debug]: htmlToSend: ", htmlToSend);
        console.log("[Debug]: elementsToTranslate: ", elementsToTranslate)

        // Get text from html elements
        blockElements.forEach((el) => {
            if (el.textContent && el.textContent.trim() !== '') {
                elementsToTranslate.push(el);
                htmlToSend.push(el.innerHTML);
            }
        });

        // Save pre-translation text to localstorage
        savePrevText(htmlToSend);

        if (htmlToSend.length === 0) {
            console.warn('[Tłumaczenie] W bieżącym rozdziale nie znaleziono żadnego tekstu do przetłumaczenia.');
            alert('Nie znaleziono żadnego tekstu do przetłumaczenia w tym rozdziale.');
            setIsTranslate(false);
            return;
        }

        if (!GEMINI_API_KEY) {
            console.error('[Tłumaczenie] Brak klucza API Gemini (zmienna środowiskowa VITE_GEMINI_API_KEY).');
            alert('Nie skonfigurowano klucza API do tłumaczenia. Ustaw zmienną VITE_GEMINI_API_KEY w pliku .env.');
            setIsTranslate(false);
            return;
        }

        try {
            setIsTranslating(true);

            try {
                const cacheResponse = await fetch(`${BACKEND_URL}/api/cache/get`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalHtmlArray: htmlToSend })
                });

                if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();
                    
                    if (cacheData.translatedHtmlArray) {
                        console.log('[Tłumaczenie] Znaleziono gotowe tłumaczenie na serwerze cache!');
                        
                        elementsToTranslate.forEach((el, index) => {
                            el.innerHTML = cacheData.translatedHtmlArray[index];
                        });

                        if (typeof view.layout === 'function') {
                            view.layout();
                        }
                        return;
                    }
                }
            } catch (cacheError) {
                console.warn('[Tłumaczenie] Brak komunikacji z serwerem Cache na porcie 3001.', cacheError);
            }

            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const finalTranslatedTexts = [];

            // Wysyła tablicę obiektów [{"id": x, "text": x}], przyjmuje taką samą przetłumaczoną
            for (let i = 0; i < htmlToSend.length; i += TRANSLATION_BATCH_SIZE) {
                const chunk = htmlToSend.slice(i, i + TRANSLATION_BATCH_SIZE);
                const chunkWithIds = chunk.map((text, idx) => ({
                    id: i + idx,
                    text,
                }));
                console.log(`[Debug]: Send to translate: ${JSON.stringify(chunkWithIds)}`)

                const response = await ai.models.generateContent({
                    model: TRANSLATION_MODEL,
                    contents: buildPrompt(JSON.stringify(chunkWithIds), bookTitle),
                    config: {
                        temperature: 0.1,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    text: { type: Type.STRING },
                                },
                                required: ['id', 'text'],
                            },
                        },
                    },
                });

                const translatedChunk = JSON.parse(response.text);
                console.log(`[Debug]: Received translation: ${JSON.stringify(translatedChunk)}`);
                translatedChunk.sort((a, b) => a.id - b.id);
                translatedChunk.forEach((item) => finalTranslatedTexts.push(item.text));
            }

            if (finalTranslatedTexts.length !== htmlToSend.length) {
                console.error(
                    `[Tłumaczenie] Niezgodność liczby elementów: wysłano ${htmlToSend.length}, otrzymano ${finalTranslatedTexts.length}. Pomijam podmianę treści, aby uniknąć uszkodzenia rozdziału.`
                );
                alert('Wystąpił błąd podczas tłumaczenia – liczba przetłumaczonych fragmentów nie zgadza się z oryginałem. Spróbuj ponownie.');
                return;
            }

            elementsToTranslate.forEach((el, index) => {
                el.innerHTML = finalTranslatedTexts[index];
            });

            if (typeof view.layout === 'function') {
                view.layout();
            }

            // 3. ZAPIS DO SERWERA NODE.JS (CACHE) PO UDANYM TŁUMACZENIU
            try {
                await fetch('http://localhost:3001/api/cache/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        originalHtmlArray: htmlToSend,
                        translatedHtmlArray: finalTranslatedTexts
                    })
                });
                console.log('[Tłumaczenie] Pomyślnie zapisano tłumaczenie rozdziału na serwerze.');
            } catch (saveError) {
                console.warn('[Tłumaczenie] Wystąpił błąd podczas zapisu do serwera Cache.', saveError);
            }

        } catch (error) {
            console.error('[Tłumaczenie] Nieoczekiwany błąd podczas tłumaczenia rozdziału:', error);
            alert('Wystąpił błąd podczas tłumaczenia rozdziału. Sprawdź konsolę przeglądarki, aby poznać szczegóły.');
        } finally {
            setIsTranslating(false);
        }
    }, []);

    const revertTranslation = (doc, view) => {
        if( !doc || !view ) return;

        const blockElements = doc.querySelectorAll(TRANSLATABLE_SELECTOR);
        const elementsToRevert = [];

        blockElements.forEach((el) => {
            if( el.textContent && el.textContent.trim() !== '' ) {
                elementsToRevert.push(el);
            }
        });

        const prevText = getPrevText();
        
        if (!prevText || prevText.length === 0) {
            console.warn('[Tłumaczenie] Nie znaleziono zapisanego oryginalnego tekstu.');
            return;
        }

        if (prevText.length !== elementsToRevert.length) {
            console.error(`[Tłumaczenie] Niezgodność liczby elementów przy cofaniu tłumaczenia ${prevText.length}/${elementsToRevert.length}.`);
            return;
        }

        elementsToRevert.forEach((el, index) => {
            el.innerHTML = prevText[index];
        });

        if (typeof view.layout === 'function') {
            view.layout();
        }

        console.log('[Tłumaczenie] Przywrócono oryginalny tekst.');
    }

    const toggleTranslation = useCallback(
        (doc, view) => {
            setIsTranslate((prevState) => {
                const newState = !prevState;
                if (newState) {
                    // True => translate
                    translateCurrentChapter(doc, view);
                } else {
                    // False => revert to original
                    revertTranslation(doc, view);
                }
                return newState;
            });
        },
        [translateCurrentChapter]
    );

    return {
        isTranslate,
        isTranslating,
        isTranslateRef,
        toggleTranslation,
        translateCurrentChapter,
    };
}