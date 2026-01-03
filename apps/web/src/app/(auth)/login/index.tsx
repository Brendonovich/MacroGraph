import { useNavigate } from "@solidjs/router";

import { LoginForm } from "../Forms";

export default function () {
	const navigate = useNavigate();

	return (
		<LoginForm
			onSignup={() => navigate("/signup")}
			onLogin={() => navigate("/")}
		/>
	);
}
