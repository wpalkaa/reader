import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { buildPrompt } from '@/lib/buildPrompt';
// import { getCachedChapter, setCachedChapter } from '../lib/bookCache';
import {
    TRANSLATION_MODEL,
    TRANSLATION_BATCH_SIZE,
    TRANSLATABLE_SELECTOR,
} from '@/lib/constants';

/**
 * Hook odpowiedzialny za tłumaczenie treści aktualnie wyświetlanego
 * rozdziału książki przy użyciu modelu Gemini, z cache'owaniem wyników
 * na dysku (zobacz `lib/bookCache.js`).
 *
 * Zasada działania:
 * 1. Jeśli przekazano `bookFileName` + `chapterId`, sprawdzamy najpierw cache –
 *    w razie trafienia wstawiamy zapisane wcześniej tłumaczenie i kończymy
 *    (bez odpytywania API).
 * 2. W przeciwnym razie pobieramy wszystkie elementy blokowe z dokumentu
 *    (iframe) rozdziału, dzielimy je na paczki (batch) i wysyłamy do modelu.
 * 3. Podmieniamy oryginalną treść HTML na przetłumaczoną, z zachowaniem tagów,
 *    a wynik zapisujemy w cache na przyszłość.
 */
export function useBookTranslation() {
    const [isTranslate, setIsTranslate] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    // Ref przechowujący aktualną wartość `isTranslate`, potrzebny wewnątrz
    // listenerów zdarzeń Foliate (żeby uniknąć odczytu nieaktualnej wartości
    // stanu przez "stale closure" w efekcie).
    const isTranslateRef = useRef(isTranslate);
    useEffect(() => {
        isTranslateRef.current = isTranslate;
    }, [isTranslate]);

    /**
     * Tłumaczy treść przekazanego dokumentu (iframe rozdziału) i podmienia
     * ją bezpośrednio w DOM, a następnie prosi Foliate o ponowne przeliczenie
     * layoutu strony.
     *
     * @param {Document} doc - dokument iframe'a aktualnie wyświetlanego rozdziału
     * @param {object} view - instancja <foliate-view>
     * @param {object} [cacheInfo] - dane potrzebne do odczytu/zapisu cache
     * @param {string} [cacheInfo.bookFileName] - nazwa pliku książki (klucz katalogu cache)
     * @param {string|number} [cacheInfo.chapterId] - identyfikator rozdziału (klucz pliku cache)
     */
    const translateCurrentChapter = useCallback(async (doc, view, cacheInfo = {}) => {
        const { bookFileName, chapterId } = cacheInfo;

        if (!doc || !view) {
            console.error('[Tłumaczenie] Brak załadowanego rozdziału lub widoku książki – nie można rozpocząć tłumaczenia.');
            return;
        }

        // Body dokumentu rozdziału – tu wstawiamy zarówno tłumaczenie z cache,
        // jak i finalny wynik świeżo przetłumaczonej treści.
        const contentRoot = doc.body || doc.documentElement;








        // 1. Sprawdzenie cache – jeśli rozdział był już wcześniej przetłumaczony
        // dla tej książki, wstawiamy zapisaną treść bez wywoływania API.
        // if (bookFileName && chapterId !== undefined && chapterId !== null) {
        //     const cachedHtml = await getCachedChapter(bookFileName, chapterId);
        //     if (cachedHtml !== null) {
        //         contentRoot.innerHTML = cachedHtml;
        //         if (typeof view.layout === 'function') {
        //             view.layout();
        //         }
        //         return;
        //     }
        // }













        const blockElements = doc.querySelectorAll(TRANSLATABLE_SELECTOR);
        const elementsToTranslate = [];
        const htmlToSend = [];

        blockElements.forEach((el) => {
            if (el.textContent && el.textContent.trim() !== '') {
                elementsToTranslate.push(el);
                htmlToSend.push(el.innerHTML);
            }
        });

        if (htmlToSend.length === 0) {
            console.warn('[Tłumaczenie] W bieżącym rozdziale nie znaleziono żadnego tekstu do przetłumaczenia.');
            alert('Nie znaleziono żadnego tekstu do przetłumaczenia w tym rozdziale.');
            setIsTranslate(false);
            return;
        }

        const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            console.error('[Tłumaczenie] Brak klucza API Gemini (zmienna środowiskowa VITE_GEMINI_API_KEY).');
            alert('Nie skonfigurowano klucza API do tłumaczenia. Ustaw zmienną VITE_GEMINI_API_KEY w pliku .env.');
            setIsTranslate(false);
            return;
        }

        try {
            setIsTranslating(true);

            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const finalTranslatedTexts = [];

            for (let i = 0; i < htmlToSend.length; i += TRANSLATION_BATCH_SIZE) {
                const chunk = htmlToSend.slice(i, i + TRANSLATION_BATCH_SIZE);
                const chunkWithIds = chunk.map((text, idx) => ({
                    id: i + idx,
                    text,
                }));

                const response = await ai.models.generateContent({
                    model: TRANSLATION_MODEL,
                    contents: buildPrompt(JSON.stringify(chunkWithIds)),
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






            
            // 2. Zapis świeżo przetłumaczonego rozdziału w cache, żeby przy
            // kolejnym otwarciu tego samego rozdziału nie odpytywać API ponownie.
            // if (bookFileName && chapterId !== undefined && chapterId !== null) {
            //     await setCachedChapter(bookFileName, chapterId, contentRoot.innerHTML);
            // }






        } catch (error) {
            console.error('[Tłumaczenie] Nieoczekiwany błąd podczas tłumaczenia rozdziału:', error);
            alert('Wystąpił błąd podczas tłumaczenia rozdziału. Sprawdź konsolę przeglądarki, aby poznać szczegóły.');
        } finally {
            setIsTranslating(false);
        }
    }, []);

    /**
     * Włącza lub wyłącza tryb tłumaczenia. Przy włączaniu od razu
     * uruchamia tłumaczenie bieżącego rozdziału (z cache lub przez API).
     *
     * @param {Document} doc - dokument iframe'a aktualnie wyświetlanego rozdziału
     * @param {object} view - instancja <foliate-view>
     * @param {object} [cacheInfo] - patrz `translateCurrentChapter`
     */
    const toggleTranslation = useCallback(
        (doc, view, cacheInfo) => {
            setIsTranslate((prevState) => {
                const newState = !prevState;
                if (newState) {
                    translateCurrentChapter(doc, view, cacheInfo);
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
