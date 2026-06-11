import React, { useState } from "react";
import { Button, Input } from "./ui";
import {
  SparklesIcon,
  GiftIcon,
  ImageIcon,
  TagIcon,
  ArrowRightIcon,
} from "./icons";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const perks = [
  {
    icon: <SparklesIcon className="w-4 h-4 text-[#FF7A59]" />,
    label: "New collections",
  },
  {
    icon: <TagIcon className="w-4 h-4 text-[#5DA9E9]" />,
    label: "Limited releases",
  },
  {
    icon: <ImageIcon className="w-4 h-4 text-[#FFC371]" />,
    label: "Behind-the-scenes artwork",
  },
  {
    icon: <GiftIcon className="w-4 h-4 text-[#FF7A59]" />,
    label: "Exclusive subscriber discounts",
  },
];

interface NewsletterSignupProps {
  source?: string;
  className?: string;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  source = "homepage",
  className = "",
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    if (!trimmed) {
      showToast("Please enter your email address.", "error");
      return;
    }

    setLoading(true);
    try {
      const result = await api.subscribeNewsletter(trimmed, source);
      setSubmitted(true);
      setEmail("");
      showToast(result.message, "success");
    } catch (err: any) {
      showToast(err?.message || "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/10 bg-gradient-to-br from-[#1E1B22] via-[#231E1A] to-[#1A1410] text-[#F7F3EA] ${className}`}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,122,89,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,195,113,0.2) 0%, transparent 40%)",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-8 md:p-12 lg:p-14">
        {/* Copy */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FF7A59]">
            Newsletter + Community
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl lg:text-[2.75rem] font-medium tracking-tight mt-3 leading-tight">
            Join The Next Drop
          </h2>
          <p className="mt-4 text-sm md:text-base text-[#F7F3EA]/75 leading-relaxed">
            Get early access to:
          </p>
          <ul className="mt-5 space-y-3">
            {perks.map((perk) => (
              <li key={perk.label} className="flex items-center gap-3 text-sm md:text-base">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                  {perk.icon}
                </span>
                <span className="text-[#F7F3EA]/90">{perk.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center">
          {submitted ? (
            <div className="rounded-2xl bg-white/8 border border-white/15 p-8 text-center">
              <p className="font-playfair text-2xl font-medium text-[#F7F3EA]">
                You're on the list.
              </p>
              <p className="mt-2 text-sm text-[#F7F3EA]/70">
                We'll email you before the next drop lands.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 text-sm text-[#FF7A59] hover:text-[#FF9966] transition-colors underline underline-offset-4"
              >
                Subscribe another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="h-12 text-base bg-white/95 border-white/20 text-brand-primary placeholder:text-brand-secondary/60"
              />
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full h-12 text-base font-bold tracking-wide gap-2 shadow-[0_4px_24px_rgba(255,94,98,0.35)]"
              >
                {loading ? "Joining…" : "Get Early Access"}
                {!loading && <ArrowRightIcon className="w-5 h-5" />}
              </Button>
              <p className="text-xs text-[#F7F3EA]/50 text-center">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
