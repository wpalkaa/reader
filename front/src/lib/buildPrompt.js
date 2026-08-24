/**
 * Buduje treść promptu wysyłanego do modelu Gemini w celu przetłumaczenia
 * fragmentów HTML na język polski, z zachowaniem struktury i tagów.
 *
 * @param {string} textToTranslate - dane wejściowe w formacie JSON (tablica obiektów {id, text})
 * @param {string} bookTitle - tytuł książki (jako kontekst dla modelu)
 * @returns {string} pełny prompt dla modelu
 */
export function buildPrompt(textToTranslate, bookTitle) {
    const contextInstruction = bookTitle 
        ? `\nContext: Tłumaczysz fragmenty pochodzące z książki zatytułowanej "${bookTitle}". Bierz ten kontekst pod uwagę przy doborze słownictwa, tonu oraz w przypadku nazw własnych.\n` 
        : '';

    return `Role: Profesjonalny tłumacz literatury na język polski (specjalizacja: e-booki).
Target: Otrzymasz tablicę obiektów JSON. Każdy obiekt zawiera pole "id" oraz "text" (fragment kodu HTML). Przetłumacz pole "text" na język polski, zachowując oryginalne pole "id" bez zmian.${contextInstruction}
Rules: Krytycznie przestrzegaj poniższych zasad:
1. NIENARUSZONY HTML: Fragmenty mogą zawierać tagi (np. <i>, <b>, <span>, <a>). Zachowaj je w odpowiednich miejscach w przetłumaczonym tekście. Absolutnie nie tłumacz nazw tagów, klas, ID ani atrybutów.
2. STRUKTURA 1:1: Zwróć dokładnie taką samą liczbę obiektów. POD ŻADNYM POZOREM nie łącz kilku obiektów w jeden, nawet jeśli logicznie tworzą jedno zdanie (np. słowo, spacja i numer). Każde oryginalne "id" musi mieć swój własny przetłumaczony "text".
3. BRAK ZMIAN I BIAŁE ZNAKI: Jeśli "text" to tylko znaki interpunkcyjne, pojedyncze liczby, spacje lub puste tagi, zwróć oryginał. Zawsze zachowuj spacje na początku i na końcu tekstu, jeśli takie występują.
4. OBSŁUGA NAZW WŁASNYCH:
   - ZACHOWAJ W ORYGINALE: Marki, technologie, języki, narzędzia oraz prawdziwe imiona/nazwiska (np. "Hermes", "JavaScript", "React"). Nie twórz z nich "polskich" przymiotników (np. "Hermes language" -> "język Hermes", a nie "język hermetyczny").
   - TŁUMACZ: Literackie nazwy własne, tytuły przedmiotów magicznych/wymyślonych, tytuły rodowe i nazwy artefaktów (np. "Amulet of The Sun God" -> "Amulet Boga Słońca", "Chamber of Secrets" -> "Komnata Tajemnic").
    Korzystaj do tego z kontekstu tytułu książki.
5. KONTEKST I GRAMATYKA: Ponieważ obiekty tworzą jedno zdanie, tłumacz każdy fragment tak, aby pasował gramatycznie (odpowiedni przypadek, rodzaj, liczba) do reszty. Po złączeniu wszystkich "text" w jedną linię, zdanie musi brzmieć naturalnie po polsku.
6. STOSUJ SŁOWNIK ("en" -> "pl"):
    - "Beyonder" - Beyonder, Beyondera, Beyonderów, Beyonderem itd.

Output format (BARDZO WAŻNE):
- Zwróć WYŁĄCZNIE poprawną składniowo tablicę obiektów JSON.
- ZAKAZ UŻYWANIA MARKDOWN. Odpowiedź nie może zawierać bloków kodu.

Przykłady:
Wejście: [{"id": 0, "text": "Hermes language"}, {"id": 1, "text": " is used for "}, {"id": 2, "text": "<i>The Amulet of The Sun God</i>."}]
Wyjście: [{"id": 0, "text": "Język Hermes"}, {"id": 1, "text": " jest używany do "}, {"id": 2, "text": "<i>Amuletu Boga Słońca</i>."}]

Oto dane do przetłumaczenia:
${textToTranslate}`;
}