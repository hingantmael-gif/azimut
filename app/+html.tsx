import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Document HTML web — PWA Azimut + pas de scrollbar visible.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#07111F" />
        <meta name="application-name" content="Azimut" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Azimut" />
        <meta
          name="description"
          content="Azimut — coaching multi-sport. Installe l’application sur téléphone, tablette ou PC."
        />
        <meta
          name="google-site-verification"
          content="6yGL_C7i88c19mN5yId8YEK4FvQgf6K29fTXr1Cm_Pw"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>Azimut</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                margin: 0;
                overscroll-behavior: none;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                background: #07111F;
              }
              *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              input:focus,
              textarea:focus,
              [contenteditable]:focus {
                outline: none !important;
                box-shadow: none !important;
              }
              input,
              textarea,
              [contenteditable="true"] {
                cursor: text !important;
                caret-color: #1a1a1a;
              }
              input[type="password"] {
                cursor: text !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js?v=21', { scope: '/' }).then(function (reg) {
                    try { reg.update(); } catch (e) {}
                    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }).catch(function () {});
                  var reloaded = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function () {
                    if (reloaded) return;
                    reloaded = true;
                    location.reload();
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
