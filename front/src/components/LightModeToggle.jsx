import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons/faLightbulb';

/**
 * Przełącznik motywu jasny/ciemny w formie animowanego "switcha".
 *
 * @param {'light'|'dark'} theme - aktualny motyw
 * @param {() => void} toggleTheme - funkcja przełączająca motyw
 */
export default function LightModeToggle({ theme, toggleTheme }) {
    return (
        <div className="absolute top-4 left-4">
            <div
                onClick={toggleTheme}
                className={`w-16 h-8  rounded-full flex items-center p-1 cursor-pointer border 
                        shadow-[0_0_15px] shadow-amber-500/20 transition-all duration-300 border-slate-700/50 ${
                            theme === 'dark'
                                ? 'bg-[#0f172a]'
                                : 'bg-white'
                        }`}
            >
                <div
                    className={`rounded-full w-6 h-6 flex justify-center items-center transition-all duration-300 transform ${
                        theme === 'dark'
                            ? 'translate-x-8 bg-linear-to-br from-amber-300 to-orange-500 shadow-[0_0_10px] shadow-orange-500/60 text-yellow-50'
                            : 'translate-x-0 bg-transparent border border-amber-500 shadow-[0_0_10px] shadow-amber-500/60 text-amber-500'
                    }`}
                >
                    <FontAwesomeIcon icon={theme === 'dark' ? faMoon : faLightbulb} />
                </div>
            </div>
        </div>
    );
}
