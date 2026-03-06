import React from "react";
import { Link } from "react-router-dom";
import { Player } from "@lottiefiles/react-lottie-player";
import { SEOHead } from "../components/SEOHead";

const btnBase =
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2";

export const CollectionsComingSoonPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20">
      <SEOHead
        title="Collections — Coming Soon | Tinge Clothing"
        description="New collections are on the way. Stay tuned for curated drops and exclusive pieces."
      />
      <div className="max-w-xl mx-auto text-center">
        <div className="w-full max-w-sm mx-auto mb-6">
          <Player
            src="/Coming-Soon.json"
            autoplay
            loop
            className="w-full"
            aria-label="Coming soon animation"
          />
        </div>
        <div className="h-px w-16 mx-auto mb-8 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-brand-primary mb-4">
          Collections dropping soon
        </h1>
        <p className="text-brand-secondary text-lg sm:text-xl mb-10 max-w-md mx-auto">
          We’re curating something special. New collections, limited runs, and exclusive pieces are on the way—stay tuned.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/categories"
            className={`${btnBase} bg-brand-accent text-white hover:bg-brand-accent-hover`}
          >
            Shop current styles
          </Link>
          <Link
            to="/"
            className={`${btnBase} border-2 border-brand-accent bg-transparent hover:bg-brand-accent/10 text-brand-accent`}
          >
            Back to home
          </Link>
        </div>
        <div className="h-px w-16 mx-auto mt-12 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
      </div>
    </div>
  );
};
