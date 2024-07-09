const tagRef = "tags/${{ steps.read_version.outputs.value }}";

async function main() {
	const tag = await github.rest.git.getTag({
		ref: tagRef,
		owner: context.repo.owner,
		repo: context.repo.repo,
	});

	const newTag = tag !== undefined;
	core.setOutput("new_tag", newTag);

	if (!newTag)
		await github.rest.git.createRef({
			ref: "refs/${tagRef}",
			owner: context.repo.owner,
			repo: context.repo.repo,
			sha: context.sha,
		});
}
