import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './app/App.tsx'

// Prevent automatic browser translation (like Google/Safari Translate) from
// translating Material Symbols ligatures. If "dashboard" becomes "tablero",
// the icon font can no longer resolve it and the UI shows broken text.
if (typeof window !== 'undefined') {
  const protectMaterialSymbols = () => {
    document.querySelectorAll<HTMLElement>('.material-symbols-outlined').forEach((el) => {
      const currentText = el.textContent?.trim() ?? '';
      const savedLigature = el.dataset.iconLigature;

      el.classList.add('notranslate');
      el.setAttribute('translate', 'no');

      if (!savedLigature && currentText) {
        el.dataset.iconLigature = currentText;
      } else if (savedLigature && currentText !== savedLigature) {
        el.textContent = savedLigature;
      }
    });
  };

  const observer = new MutationObserver(protectMaterialSymbols);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  queueMicrotask(protectMaterialSymbols);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
