"use client";

import { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function AuthHeader() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [mockUser, setMockUser] = useState<string | null>(null);

  if (hasClerkKey) {
    return (
      <div className="flex items-center space-x-3">
        <SignedIn>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-emerald-400 border border-emerald-800/80 bg-emerald-950/40 px-2 py-0.5 rounded">
              PRO
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
        <SignedOut>
          <div className="flex items-center space-x-3">
            <SignInButton mode="modal">
              <button className="text-xs font-mono text-neutral-300 hover:text-white transition">
                Kirjaudu
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-xs font-mono font-medium text-neutral-100 border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition">
                Kokeile maksutta
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>
    );
  }

  // Fallback kun Clerk API-avaimia ei ole vielä viety .env-tiedostoon
  return (
    <div className="flex items-center space-x-3">
      {mockUser ? (
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-emerald-400 border border-emerald-800/80 bg-emerald-950/40 px-2 py-0.5 rounded">
            PRO
          </span>
          <button
            onClick={() => setMockUser(null)}
            className="flex items-center space-x-1.5 text-xs font-mono text-neutral-300 hover:text-white border border-neutral-800 px-2.5 py-1 rounded"
            title="Klikkaa kirjautuaksesi ulos"
          >
            <span className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[10px]">
              {mockUser[0]}
            </span>
            <span>{mockUser}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMockUser("Mikael")}
            className="text-xs font-mono text-neutral-400 hover:text-white transition"
          >
            Kirjaudu
          </button>
          <button
            onClick={() => setMockUser("Mikael (Pro)")}
            className="text-xs font-mono font-medium text-neutral-200 border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition"
          >
            Kokeile maksutta
          </button>
        </div>
      )}
    </div>
  );
}
