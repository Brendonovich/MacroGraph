import { useNavigate } from "@solidjs/router";
import { SignUpForm } from "./Forms";

export default function () {
  const navigate = useNavigate();

  return (
    <SignUpForm
      onLogin={() => navigate("/login")}
      onSignup={() => navigate("/")}
    />
  );
}
