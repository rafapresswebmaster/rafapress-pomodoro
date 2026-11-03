# Mobile usability

Implemented 2026-11-03 for the online browser build. The adaptation is enabled only for coarse pointers at phone-sized widths (up to 900 CSS pixels) or short phone landscape heights (up to 520 CSS pixels). Desktop mouse, wheel and keyboard layouts retain their existing rules.

## Layout and input

- The viewport uses `width=device-width`, `initial-scale=1` and `viewport-fit=cover` without disabling browser zoom.
- Safe-area insets protect fixed controls around notches and browser chrome. Dynamic viewport units are used where supported, with ordinary viewport sizing retained as fallback.
- A phone opened in portrait uses a 624-unit logical width and a height matched to the startup viewport (bounded from 816 to 1400), selected before the first scene. This avoids shrinking the complete 816×624 desktop canvas into a narrow strip or leaving most of the phone black. The source database dimensions are restored immediately and no geometry is written to saves. Landscape and desktop retain 816×624.
- Mobile DOM controls use a minimum 44 CSS-pixel target. The focus timer, Recall, alarm, camp navigation, manual, quest filters, Start Quest and character creator no longer inherit the canvas's reduced CSS scale.
- Character creation uses a native text input and a vertically scrolling body. Class and portrait choices reflow to two columns on phones; the footer remains reachable.
- The manual fills the usable phone viewport. Topic tabs scroll horizontally and article content scrolls vertically with native touch behavior.
- Confirmation dialogs and long content use bounded native vertical scrolling. The global document no longer blocks touch movement; only the game canvas owns engine gestures.

Canvas lists continue to use RPG Maker MZ's shared `Window_Scrollable` drag implementation. On coarse pointers, selection and activation use only MZ's release-based click path, which invalidates a click after movement. The desktop pointer-down compatibility bridge, including the Altar bridge, is retained only for fine pointers and removes all listeners on scene disposal.

DOM overlays use the browser's single native click path on coarse pointers; no synthetic click, global click suppressor or release-coordinate interceptor is installed. Native scrolling cancels taps that turn into gestures. The creation footer remains sticky inside the form, keeping Back and Review/Confirm reachable above long portrait lists and phone keyboard resizing.

Canvas controls use RPG Maker's native touch state without plugin-level trigger, release, repeat or long-press overrides. The engine records real touch activity and ignores only compatibility mouse down/up events arriving during the following second, preventing one touch from being interpreted again as a mouse click. The canvas declares `touch-action: pinch-zoom`, and browser touchstart is no longer cancelled outside Cordova, making two-finger page zoom consistent while preserving single-touch game input.

## Supported use

The supported target is a foreground mobile browser session: create or recruit a companion, configure and dispatch a quest, leave the journey visible, Recall if desired, review results and use camp screens. Existing elapsed-time, catch-up, save and once-only settlement rules are unchanged. This work does not promise locked-screen timers, offline play, background alarms, wake locks or push notifications.

## Verification

Fresh checks for this edition cover viewport/zoom policy, coarse-pointer scoping, safe areas, CSS-pixel target sizes, mobile reflow selectors, drag cancellation, release-only activation, pointer cancellation and desktop bridge preservation. JavaScript syntax and current class-data validation are also checked.

Automated browser viewport review uses touch emulation at 360×640, 390×844, 412×915, 640×360, 844×390, 768×1024 and a 1366×768 desktop control. Representative screenshots are stored under `tests/visuals/mobile-usability/` when browser tooling is available.

Real Android Chrome and iPhone Safari hardware, foreground audio behavior and real five-minute quest observation remain manual checks; emulation is not represented as real-device validation.
