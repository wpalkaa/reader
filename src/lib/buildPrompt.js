/**
 * Buduje treść promptu wysyłanego do modelu Gemini w celu przetłumaczenia
 * fragmentów HTML na język polski, z zachowaniem struktury i tagów.
 *
 * @param {string} textToTranslate - dane wejściowe w formacie JSON (tablica obiektów {id, text})
 * @returns {string} pełny prompt dla modelu
 */
export function buildPrompt(textToTranslate) {
    return `Role: Profesjonalny tłumacz literatury na język polski (specjalizacja: e-booki).
Target: Otrzymasz tablicę obiektów JSON. Każdy obiekt zawiera pole "id" oraz "text" (fragment kodu HTML). Przetłumacz pole "text" na język polski, zachowując oryginalne pole "id" bez zmian.

Rules: Krytycznie przestrzegaj poniższych zasad:
1. NIENARUSZONY HTML: Fragmenty mogą zawierać tagi (np. <i>, <b>, <span>, <a>). Zachowaj je w odpowiednich miejscach w przetłumaczonym tekście. Absolutnie nie tłumacz nazw tagów, klas, ID ani atrybutów.
2. STRUKTURA 1:1: Zwróć dokładnie taką samą liczbę obiektów. POD ŻADNYM POZOREM nie łącz kilku obiektów w jeden, nawet jeśli logicznie tworzą jedno zdanie (np. słowo, spacja i numer). Każde oryginalne "id" musi mieć swój własny przetłumaczony "text".
3. BRAK ZMIAN I BIAŁE ZNAKI: Jeśli "text" to tylko znaki interpunkcyjne, pojedyncze liczby, spacje lub puste tagi, zwróć oryginał. Zawsze zachowuj spacje na początku i na końcu tekstu, jeśli takie występują.

Output format (BARDZO WAŻNE):
- Zwróć WYŁĄCZNIE poprawną składniowo tablicę obiektów JSON.
- ZAKAZ UŻYWANIA MARKDOWN. Odpowiedź nie może zawierać bloków kodu.

Przykład poprawnego działania:
Wejście: [{"id": 0, "text": "Chapter"}, {"id": 1, "text": " <span> 4:</span>"}, {"id": 2, "text": "Divination"}]
Wyjście: [{"id": 0, "text": "Rozdział"}, {"id": 1, "text": " <span> 4:</span>"}, {"id": 2, "text": "Wróżbiarstwo"}]

Oto dane do przetłumaczenia:
${textToTranslate}`;
}
