const tagRef = "tags/${{ steps.read_version.outputs.value }}";

async function main() {
	let tagExists = false;

	try {
		const tag = await github.rest.git.getRef({
			ref: tagRef,
			owner: context.repo.owner,
			repo: context.repo.repo,
		});
		if (tag) tagExists = true;
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
