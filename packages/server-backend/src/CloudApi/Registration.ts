import { Context } from "effect";

export class CloudRegistration extends Context.Tag("CloudRegistration")<
	CloudRegistration,
	{
		token: string;
		ownerId: string;
	}
>() {}
