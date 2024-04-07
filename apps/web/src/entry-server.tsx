import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <meta
              http-equiv="Content-Security-Policy"
              content="connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;"
            />
            <link rel="icon" href="/favicon.png" />
            {assets}
          </head>
          <body class="w-screen h-screen bg-black" id="app">
            {children}
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  { mode: "async" }
);
