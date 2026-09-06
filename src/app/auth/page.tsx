import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";

export default function AuthPage() {
  return (
    <main className="authPage">
      <Link href="/" className="wordmark authWordmark">Little Hut</Link>
      <section className="authPanel">
        <p className="eyebrow">Private access</p>
        <h1>One link. No password.</h1>
        <p className="authIntro">
          Guests use it to request verified stays. Owners, scouts, assessors and operators enter the same secure workspace with role-scoped access.
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
