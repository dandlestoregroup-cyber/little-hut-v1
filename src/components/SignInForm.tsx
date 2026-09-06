"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in activates when the Little Hut database is connected.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/workspace";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email. Your secure Little Hut sign-in link is on its way.");
  }

  return (
    <form className="authForm" onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <button type="submit" disabled={status === "sending" || status === "sent"}>
        {status === "sending" ? "Sending…" : status === "sent" ? "Link sent" : "Continue securely"}
      </button>
      {message ? <p className={`formMessage ${status === "error" ? "isError" : ""}`}>{message}</p> : null}
    </form>
  );
}
