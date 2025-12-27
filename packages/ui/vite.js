import { Icons } from "@macrograph/icons/vite";

// Workaround for https://github.com/solidjs/solid-start/issues/1374
// const VinxiAutoImport = (options) => {
// 	const autoimport = AutoImport(options);

// 	return {
// 		...autoimport,
// 		transform(src, id) {
// 			let pathname = id;

// 			if (id.startsWith("/")) {
// 				pathname = new URL(`file://${id}`).pathname;
// 			}

// 			return autoimport.transform(src, pathname);
// 		},
// 	};
// };

export default Icons();
