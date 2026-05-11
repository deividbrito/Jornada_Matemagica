// src/main.js
// Entry point único do bundle Vite.
//
// Estratégia (compatível com a base legacy que dependia de classes globais):
//   1. Importa CSS — Vite injeta no <head>.
//   2. Importa cada módulo na ORDEM CORRETA de dependência. Cada um faz
//      `window.X = X` no final, então classes ficam acessíveis pelo escopo
//      global (mantém o código existente que chama `new ClassName(...)`).
//   3. Após DOMContentLoaded, instancia o Overworld (era init.js).
//
// Onda 4+: migrar dos `window.X` para imports nominais explícitos.

// --- estilos ----------------------------------------------------------------
import './styles/global.css';
import './styles/TextMessage.css';
import './styles/QuizTutorial.css';
import './styles/SceneTransition.css';
import './styles/Menus.css';
import './styles/KeyboardMenu.css';
import './styles/TitleScreen.css';
import './styles/ChoiceMessage.css';
import './styles/login.css';
import './styles/DecisionMessage.css';
import './styles/TouchControls.css';
import './styles/ShowMap.css';
import './styles/PopupWindow.css';
import './styles/ArcadeHUD.css';

// --- camada de infra (sem dependências entre si) ----------------------------
import './utils.js';
import './apiClient.js';
import './AudioManager.js';

// --- entrada do usuário e listeners ----------------------------------------
import './KeyPressListener.js';
import './DirectionInput.js';

// --- engine base (GameObject precisa vir antes de Person) -------------------
import './GameObject.js';
import './Sprite.js';
import './Person.js';

// --- UI primitivas ----------------------------------------------------------
import './RevealingText.js';
import './TextMessage.js';
import './ChoiceMessage.js';
import './DecisionMessage.js';
import './PopupWindow.js';
import './KeyboardMenu.js';
import './SceneTransition.js';
import './TouchControls.js';
import './ShowMap.js';
import './ArcadeHUD.js';

// --- estado / persistência --------------------------------------------------
import './PlayerState.js';
import './ArcadeMeta.js';
import './Progress.js';

// --- domínio do jogo --------------------------------------------------------
import './LoginForm.js';
import './PauseMenu.js';
import './QuizGame.js';

// --- engine de eventos / mapas ----------------------------------------------
import './OverworldEvent.js';
import './OverworldEventRunner.js';
import './OverworldMap.js';
import './Overworld.js';

// --- tela inicial -----------------------------------------------------------
import './TitleScreen.js';

// --- boot -------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const overworld = new window.Overworld({
    element: document.querySelector('.game-container'),
  });
  overworld.init();
});
