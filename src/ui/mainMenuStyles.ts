export const MAIN_MENU_CSS = `
  #main-menu {
    background: #141418;
    color: #d4d4dc;
    font-family: system-ui, -apple-system, sans-serif;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .menu-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 100%;
    box-sizing: border-box;
    padding: 34px 29px 48px;
    justify-content: center;
  }
  #main-menu.menu-expanded .menu-content {
    justify-content: flex-start;
    padding-top: 43px;
  }
  .menu-logo {
    width: 86px;
    height: auto;
    margin: 0 0 17px;
    display: block;
    animation: menuLogoFloat 4.2s ease-in-out infinite;
  }
  @keyframes menuLogoFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .menu-logo {
      animation: none;
    }
  }
  .menu-title {
    font-size: 43px;
    font-weight: 600;
    margin: 0 0 32px;
    color: #eeeef2;
  }
  .menu-section-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
    margin-bottom: 10px;
  }
  .menu-mode-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .menu-entry {
    width: 336px;
    padding: 14px 17px;
    border: 1px solid #3a3a44;
    border-radius: 7px;
    background: #1c1c22;
    color: #d4d4dc;
    font-size: 17px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    user-select: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .menu-entry:hover {
    background: #222228;
    border-color: #4a4a56;
  }
  .menu-entry.selected {
    border-color: #6a8ab8;
    background: #1e2430;
  }
  .menu-entry .mode-status {
    font-size: 14px;
    color: #888894;
    flex-shrink: 0;
  }
  .menu-entry.selected .mode-status {
    color: #8ab0d8;
  }
  .menu-preview-section {
    margin: 19px 0 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .menu-preview-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
    margin-bottom: 7px;
  }
  #map-preview {
    width: 264px;
    height: 264px;
    border: 1px solid #3a3a44;
    border-radius: 4px;
    background: #0e0e12;
    display: block;
  }
  #menu-start-btn {
    margin-top: 29px;
    padding: 12px 34px;
    font-size: 17px;
    font-weight: 500;
    background: #2a4a7a;
    color: #f0f4fa;
    border: 1px solid #3a5a8a;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.12s ease, opacity 0.12s ease;
  }
  #menu-start-btn:hover:not(.disabled) {
    background: #345a8a;
  }
  #menu-start-btn:active:not(.disabled) {
    background: #24406a;
  }
  #menu-start-btn.disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #2a2a32;
    border-color: #3a3a44;
    color: #888894;
  }
  #map-regen-btn {
    margin-top: 10px;
    font-size: 14px;
    padding: 6px 12px;
    background: transparent;
    color: #a0a0ac;
    border: 1px solid #3a3a44;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  #map-regen-btn:hover {
    background: #222228;
    color: #d4d4dc;
  }
  .menu-volume {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
  }
  .menu-volume-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
  }
  .menu-volume-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #music-volume {
    width: 168px;
    accent-color: #5a7aaa;
    cursor: pointer;
  }
  #music-volume-value {
    font-size: 14px;
    color: #888894;
    width: 38px;
    text-align: right;
  }
  .menu-hint {
    margin: 19px 29px 0;
    max-width: 432px;
    font-size: 14px;
    line-height: 1.5;
    color: #686874;
  }
`;
