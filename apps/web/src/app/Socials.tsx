export function Socials(props: { iconClass?: string }) {
	return (
		<>
			<a
				class="hover:text-[#7289da] p-1"
				target="_blank"
				href="https://discord.gg/FEyYaC8v53"
				rel="noreferrer"
			>
				<IconIcBaselineDiscord class={props.iconClass} />
			</a>
			<a
				class="hover:text-neutral-500 p-1"
				target="_blank"
				href="https://x.com/macrographio"
				rel="noreferrer"
			>
				<IconRiTwitterXFill class={props.iconClass} />
			</a>
			<a
				class="hover:text-[#4078c0] p-1"
				target="_blank"
				href="https://github.com/brendonovich/macrograph"
				rel="noreferrer"
			>
				<IconMdiGithub class={props.iconClass} />
			</a>
		</>
	);
}
