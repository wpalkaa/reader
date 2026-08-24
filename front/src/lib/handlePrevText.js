export function savePrevText(text) {
    const textToSave = JSON.stringify(text);
    sessionStorage.setItem("prevText", textToSave);
}

export function getPrevText() {
    const prevText = sessionStorage.getItem("prevText");
    const finalText = JSON.parse(prevText);

    if( finalText ) return finalText;
    return null
}