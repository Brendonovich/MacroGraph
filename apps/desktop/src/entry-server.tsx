import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <title>MacroGraph</title>
          {assets}
        </head>

        <body>
          <div class="w-screen h-screen" id="app">
            {children}
          </div>
          {scripts}
        </body>
      </html>
    )}
  />
));
