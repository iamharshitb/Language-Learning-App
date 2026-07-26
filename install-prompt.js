/* Nerchuko — install banner. Shows a custom "Install" prompt instead of
   waiting for the browser's own UI. Chrome/Edge/Android support a real
   programmatic install via `beforeinstallprompt`; iOS Safari has no such
   API, so it gets manual "Add to Home Screen" instructions instead. */

(function () {
  const DISMISS_KEY = "nerchuko-install-dismissed";

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true // iOS Safari
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function wasDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no-op */
    }
  }

  if (isStandalone() || wasDismissed()) return;

  const banner = document.getElementById("install-banner");
  const sub = document.getElementById("install-sub");
  const installBtn = document.getElementById("install-btn");
  const dismissBtn = document.getElementById("install-dismiss");
  if (!banner) return;

  function show() {
    banner.classList.remove("hidden");
  }
  function hide() {
    banner.classList.add("hidden");
  }

  dismissBtn.addEventListener("click", () => {
    hide();
    markDismissed();
  });

  if (isIOS()) {
    // No install API on iOS — show instructions instead of a button.
    sub.textContent = "Tap the Share icon, then \"Add to Home Screen\".";
    installBtn.textContent = "Got it";
    installBtn.addEventListener("click", () => {
      hide();
      markDismissed();
    });
    // Give it a moment so it doesn't appear the instant the page loads.
    setTimeout(show, 2000);
    return;
  }

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    show();
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      hide();
      return;
    }
    installBtn.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hide();
    markDismissed();
  });

  window.addEventListener("appinstalled", () => {
    hide();
    markDismissed();
  });
})();
