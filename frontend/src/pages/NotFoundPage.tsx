import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { Player } from "@lottiefiles/react-lottie-player";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-4xl w-full">
        <Card className="relative flex flex-col md:flex-row items-center gap-10 px-6 py-10 md:px-10 md:py-12">
          {/* Animation */}
          <div className="relative z-10 w-full md:w-1/2 flex justify-center">
            <Player
              src="/404-animation.json"
              autoplay
              loop
              className="w-full max-w-md"
              aria-label="Page not found animation"
            />
          </div>

          {/* Copy + actions */}
          <div className="relative z-10 w-full md:w-1/2 text-center md:text-left space-y-5">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-1">
              Lost in the threads
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-display text-brand-primary leading-tight">
              404 – Page not stitched yet.
            </h1>
            <p className="text-sm md:text-base text-brand-secondary max-w-md mx-auto md:mx-0">
              The link you followed might be broken, or the page may have been
              removed from our latest collection. Let&apos;s get you back to
              browsing something you&apos;ll love.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-2">
              <Button
                onClick={() => navigate("/")}
                className="w-full sm:w-auto px-6 py-3 text-sm md:text-base"
              >
                Back to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/best-sellers")}
                className="w-full sm:w-auto px-6 py-3 text-sm md:text-base"
              >
                Explore Best Sellers
              </Button>
            </div>

            <p className="text-xs text-brand-secondary/70 pt-2">
              Error code: <span className="font-mono text-brand-accent">404</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

