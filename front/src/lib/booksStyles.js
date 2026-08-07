/**
 * Zwraca reguły CSS wstrzykiwane do treści książki wewnątrz iframe'a Foliate,
 * dopasowane do aktualnie wybranego motywu (jasny/ciemny).
 *
 * @param {'light' | 'dark'} currentTheme - aktualnie wybrany motyw aplikacji
 * @returns {string} arkusz stylów CSS w postaci tekstu
 */
export function getBookStyles(currentTheme) {
    const textColor = currentTheme === 'dark' ? '#ffffff' : '#000000';

    return `
        p, li, div, h1, h2, h3, h4, h5, h6 {
            color: ${textColor};
        }
    `;
}
