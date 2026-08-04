export function buildPrompt(textToTranslate) {
    return `Role: Profesjonalny tłumacz literatury na język polski (specjalizacja: e-booki).
Target: Otrzymasz tablicę JSON zawierającą fragmenty kodu HTML z książki. Przetłumacz je na język polski, zachowując oryginalną strukturę danych.

Rules: Krytycznie przestrzegaj poniższych zasad:
1. NIENARUSZONY HTML: Zachowaj absolutnie wszystkie tagi HTML (np. <i>, <b>, <span>), klasy, ID oraz ich oryginalne ułożenie.
2. TYLKO TEKST: Tłumacz wyłącznie tekst bezpośrednio widoczny dla czytelnika (pomiń nazwy klas, ścieżki do plików itp.).
3. KONTEKST I PŁEĆ: Zwracaj szczególną uwagę na poprawną odmianę czasowników w zależności od płci bohaterów (np. "objaśnił" vs "objaśniła") i zachowaj naturalny, literacki styl.
4. STRUKTURA 1:1: Musisz zwrócić DOKŁADNIE taką samą liczbę elementów w tablicy, jaką otrzymałeś. Każdy przetłumaczony element musi odpowiadać oryginałowi pod tym samym indeksem.
5. BRAK ZMIAN: Jeśli element nie wymaga tłumaczenia (np. puste tagi, same znaki interpunkcyjne), zwróć jego oryginalną wartość.

Output format (BARDZO WAŻNE):
- Zwróć WYŁĄCZNIE poprawną składniowo tablicę JSON.
- ZAKAZ UŻYWANIA MARKDOWN. Odpowiedź nie może zawierać bloków kodu (np. \`\`\`json). Musi zaczynać się bezpośrednio od znaku "[" i kończyć na "]".
- Uważaj na znaki specjalne: pamiętaj o poprawnym escapowaniu wewnętrznych cudzysłowów (używając \\"), aby nie uszkodzić struktury JSON.
- Tablica nie może zawierać pustych elementów (chyba że takie były w oryginale). Nigdy nie używaj podwójnych przecinków.

Przykład oczekiwanego formatu odpowiedzi:
["<p>Przetłumaczony element 1</p>", "<span>Przetłumaczony element 2</span>"]

Oto dane do przetłumaczenia:
${textToTranslate}`;
}