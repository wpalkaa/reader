/**
 * Ekran początkowy aplikacji – wybór pliku .epub do wczytania.
 *
 * @param {(file: File) => void} onSelectFile - wywoływane po wybraniu pliku przez użytkownika
 */
export default function FileUploadScreen({ onSelectFile }) {
    const handleChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            onSelectFile(event.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col gap-2 justify-center mb-30 w-[40vw] items-center">
            <label className="text-2xl font-bold">Wybierz książkę:</label>
            <input
                type="file"
                accept=".epub"
                required
                onChange={handleChange}
                className="file:border file:border-green-500"
            />
        </div>
    );
}
