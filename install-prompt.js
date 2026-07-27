/* Nerchuko — install banner.
   Previously this only showed up if `beforeinstallprompt` fired — but Chrome
   doesn't guarantee that event (it depends on engagement heuristics it
   doesn't document, and plenty of browsers — Firefox, most in-app browsers —
   never fire it at all). So now the banner always appears (unless already
   installed or previously dismissed), with generic instructions by default,
   and upgrades to a real one-tap install button if/when the browser
   cooperates. iOS gets its own precise instructions since Safari has no
   install API whatsoever. */

(function () {
  const DISMISS_KEY = "nerchuko-install-dismissed";
  const GENERIC_MSG = "Open your browser menu (⋮ or •••) and choose \"Install app\" or \"Add to Home screen\".";
  const IOS_MSG = "Tap the Share icon, then \"Add to Home Screen\".";

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
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

  if (isStandalone()) {
    console.log("[Nerchuko install] already running standalone — no banner.");
    return;
  }
  if (wasDismissed()) {
    console.log("[Nerchuko install] previously dismissed — no banner. Clear localStorage to reset.");
    return;
  }

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
    sub.textContent = IOS_MSG;
    installBtn.textContent = "Got it";
    installBtn.addEventListener("click", () => {
      hide();
      markDismissed();
    });
    setTimeout(show, 1500);
    return;
  }

  // Non-iOS: show generic instructions right away, and upgrade to a real
  // one-tap install button the moment a deferred prompt is available —
  // whether it was captured before this script even ran (see the inline
  // capture in <head>) or fires later while the banner is already showing.
  sub.textContent = GENERIC_MSG;
  installBtn.textContent = "Got it";

  function upgradeToOneTapInstall(deferredPrompt) {
    sub.textContent = "Add it to your home screen for quick, full-screen access.";
    installBtn.textContent = "Install";
    installBtn.onclick = async () => {
      installBtn.disabled = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      window.__nerchukoDeferredPrompt = null;
      hide();
      markDismissed();
    };
    show(); // reveal right away — no need to wait for the fixed delay once we know install is actually possible
  }

  if (window.__nerchukoDeferredPrompt) {
    upgradeToOneTapInstall(window.__nerchukoDeferredPrompt);
  } else {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.__nerchukoDeferredPrompt = e;
      upgradeToOneTapInstall(e);
    });
    installBtn.onclick = () => {
      hide();
      markDismissed();
    };
  }

  window.addEventListener("appinstalled", () => {
    console.log("[Nerchuko install] appinstalled fired.");
    hide();
    markDismissed();
  });

  setTimeout(show, 1500);
})();
