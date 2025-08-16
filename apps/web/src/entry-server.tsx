import { StartServer, createHandler } from "@solidjs/start/server";
import globalCss from "@macrograph/ui/global.css?url";

export default createHandler(
	() => (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html lang="en" class="w-full h-full">
					<head>
						<meta charset="utf-8" />
						<link rel="icon" href="/favicon.png" />
						<link rel="stylesheet" href={globalCss} />
						{assets}
					</head>
					<body class="bg-neutral-900 w-full h-full" id="app">
						{children}
						{scripts}
					</body>
				</html>
			)}
		/>
	),
	{ mode: "async" },
);
