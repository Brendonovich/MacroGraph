const tag = "${{ steps.read_version.outputs.value }}";
const tagRef = `tags/${tag}`;

async function main() {
	let tagExists = true;

	try {
		await github.rest.git.getRef({
			ref: tagRef,
			owner: context.repo.owner,
			repo: context.repo.repo,
		});

		core.notice(`Tag '${tag}' already exists.`);
	} catch (error) {
		if ("status" in error && error.status === 404) tagExists = false;
		else throw error;
	}

	core.setOutput("tag_exists", tagExists);

	if (!tagExists)
		await github.rest.git.createRef({
			ref: "refs/${tagRef}",
			owner: context.repo.owner,
			repo: context.repo.repo,
			sha: context.sha,
		});
}

main();
