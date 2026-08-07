import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Sidebar({ isOpen, onClose, toc, onNavigate }) {
    const renderTocItems = (items) => {
        return (
            <ul className="pl-4 mt-2 space-y-2">
                {items.map((item, index) => (
                    <li key={index} className="flex flex-col">
                        <button
                            className="text-left hover:text-green-500 transition-colors duration-200 text-sm md:text-base"
                            onClick={() => {
                                onNavigate(item.href);
                                onClose(); 
                            }}
                        >
                            {item.label}
                        </button>
                        {/* Jeśli są podrozdziały, renderujemy je rekurencyjnie */}
                        {item.subitems && item.subitems.length > 0 && (
                            renderTocItems(item.subitems)
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <>
            {/* Tło przyciemniające resztę aplikacji (Overlay) */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={onClose}
                ></div>
            )}

            {/* Panel boczny */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-bg-secondary text-text-primary border-r border-amber-200 dark:border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-5">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-gray-700 pb-2">
                        <h2 className="text-xl font-bold">Spis treści</h2>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:text-red-500 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>

                    {toc && toc.length > 0 ? (
                        <div className="-ml-4">
                            {renderTocItems(toc)}
                        </div>
                    ) : (
                        <p className="text-sm italic opacity-70">Brak spisu treści dla tej książki.</p>
                    )}
                </div>
            </div>
        </>
    );
}