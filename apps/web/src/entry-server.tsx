import { StartServer, createHandler } from "@solidjs/start/server";

export default createHandler(
	() => (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html lang="en">
					<head>
						<meta charset="utf-8" />
						<link rel="icon" href="/favicon.png" />
						{assets}
					</head>
					<body class="bg-neutral-900" id="app">
						{children}
						{scripts}
					</body>
				</html>
			)}
		/>
	),
	{ mode: "async" },
);
