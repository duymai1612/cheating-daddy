# Code Standards & Guidelines

## 1. General Principles
*   **KISS (Keep It Simple, Stupid):** Avoid over-engineering. The app needs to be fast and lightweight.
*   **Stealth First:** Any feature that increases the footprint or visibility of the app must be carefully reviewed.
*   **Async/Await:** Prefer `async/await` over raw Promises for readability.

## 2. Electron Best Practices
*   **IPC Security:**
    *   Never enable `nodeIntegration` in the renderer.
    *   Use `contextBridge` to expose safe APIs to the frontend.
    *   Validate all IPC message payloads in the Main process.
*   **Performance:**
    *   Avoid blocking the Main process event loop.
    *   Perform heavy image processing or audio encoding in worker threads or dedicated utility processes.

## 3. Frontend (LitElement)
*   **Component Structure:**
    ```javascript
    import { LitElement, html, css } from 'lit';

    export class MyComponent extends LitElement {
      static styles = css`...`;
      static properties = { ... };

      render() {
        return html`...`;
      }
    }
    customElements.define('my-component', MyComponent);
    ```
*   **State Management:** Use reactive properties for local state. Lift state up to `CheatingDaddyApp.js` only when necessary for global access.
*   **Styling:** Use Shadow DOM for style encapsulation. Use CSS variables for theming (e.g., transparency levels).

## 4. Naming Conventions
*   **Files:** `camelCase.js` for utilities, `PascalCase.js` for classes/components.
*   **Variables:** `camelCase`.
*   **Constants:** `UPPER_SNAKE_CASE` for configuration values (e.g., `MAX_RECONNECTION_ATTEMPTS`).
*   **IPC Channels:** `kebab-case` (e.g., `set-stealth-level`, `update-response`).

## 5. Error Handling
*   **API Failures:** Gracefully handle network drops or API quotas. Show non-intrusive toast notifications to the user.
*   **Audio Capture:** If audio capture fails, fallback to a visual error indicator rather than crashing the app.
*   **Logging:** Use `console.debug` for development logs and `console.error` for critical failures. **Never log API keys.**

## 6. Git Workflow
*   **Branches:** `main` is production-ready. Develop on `feat/feature-name` or `fix/issue-name`.
*   **Commits:** Use Conventional Commits (e.g., `feat: add stealth mode`, `fix: audio buffer overflow`).
