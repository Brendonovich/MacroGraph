import { createHandler, StartServer } from "@solidjs/start/server";
// import globalCss from "@macrograph/ui/global.css?url";

export default createHandler(
	() => (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html lang="en" class="w-full h-full">
					<head>
						<meta charset="utf-8" />
						<link rel="icon" href="/favicon.png" />
						<meta
							name="viewport"
							content="width=device-width, initial-scale=1, maximum-scale=1"
						/>
						{/*<link rel="stylesheet" href={globalCss} />*/}
						{assets}
					</head>
					<body class="dark bg-neutral-900" id="app">
						{children}
						{scripts}
					</body>
				</html>
			)}
		/>
	),
	{ mode: "async" },
);
