import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
