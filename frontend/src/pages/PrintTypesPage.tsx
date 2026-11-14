import React from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "../components/SEOHead";
import { ACP_CUTS, PRINT_TYPES } from "../data/printTypes";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] focus-visible:ring-offset-2";

export const PrintTypesPage: React.FC = () => {
  return (
    <div className="animate-fadeIn pb-20">
      <SEOHead
        title="What Tinge Prints"
        description="Tinge prints in-house: framed UV on ACP, canvas, sunboard, and neon. ACP sizes are cut from a 12 by 4 ft sheet so the material is used."
        keywords="Tinge prints, UV ACP frame, canvas print India, sunboard print, neon sign, wall art sizes"
      />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF7A59]">
          Printed in our studio
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-medium tracking-tight text-brand-primary mt-4">
          Four ways to put something on a wall.
        </h1>
        <p className="mt-5 text-brand-secondary leading-relaxed text-lg">
          Each line is a different material and a different thing in the box.
          The artwork can be one of ours, or a file you send. The size is
          always one we already cut.
        </p>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-2" aria-label="Print materials">
        {PRINT_TYPES.map((type) => (
          <article
            key={type.id}
            id={type.id}
            className="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface p-6 md:p-8 scroll-mt-28"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF7A59]">
              {type.tag}
            </p>
            <h2 className="font-playfair text-2xl md:text-3xl text-brand-primary mt-3">
              {type.name}
            </h2>
            <p className="mt-4 text-base text-brand-primary font-medium leading-relaxed">{type.summary}</p>
            <p className="mt-3 text-base text-brand-secondary leading-relaxed">
              {type.detail}
            </p>
            <dl className="mt-6 space-y-3 text-base">
              <div>
                <dt className="text-sm font-semibold text-brand-secondary">What arrives</dt>
                <dd className="text-brand-primary">{type.arrives}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-secondary">Sizes</dt>
                <dd className="text-brand-primary">{type.sizes}</dd>
              </div>
            </dl>
            <Link
              to={`/custom-design?material=${type.id}`}
              className={`mt-8 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#FF7A59] px-6 text-base font-semibold text-[#FFF8EE] transition-colors duration-200 hover:bg-[#FF5E62] ${focusRing}`}
            >
              Use your art on {type.name}
            </Link>
          </article>
        ))}
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-20" aria-labelledby="sheet-heading">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF7A59]">
            ACP sheet
          </p>
          <h2 id="sheet-heading" className="font-playfair text-3xl md:text-4xl text-brand-primary mt-3">
            One 12 × 4 ft sheet. Six sizes. No offcut.
          </h2>
          <p className="mt-4 text-base text-brand-secondary leading-relaxed">
            The largest panel we can print in one piece is 12 ft by 4 ft.
            The smaller sizes exist so the rest of that sheet becomes a
            finished print. A triptych is three 4 × 4 ft panels from the
            same sheet.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACP_CUTS.map((cut) => (
            <div
              key={cut.id}
              className="rounded-2xl border border-gray-200 dark:border-white/10 p-6 bg-brand-bg"
            >
              <h3 className="font-playfair text-2xl text-brand-primary">{cut.name}</h3>
              <p className="mt-3 text-2xl font-playfair text-brand-primary">{cut.size}</p>
              <p className="mt-3 text-base text-brand-secondary">{cut.panels}</p>
              <p className="mt-2 text-base text-brand-primary">{cut.bestFor}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            to="/custom-design"
            className={`inline-flex items-center justify-center min-h-12 px-6 rounded-full bg-[#FF7A59] text-[#FFF8EE] text-base font-semibold cursor-pointer transition-colors duration-200 hover:bg-[#FF5E62] ${focusRing}`}
          >
            Use your own art
          </Link>
          <Link
            to="/collections"
            className={`inline-flex items-center justify-center min-h-12 px-6 rounded-full border border-gray-300 dark:border-white/20 text-brand-primary text-base font-semibold cursor-pointer transition-colors duration-200 hover:border-[#FF7A59]/60 ${focusRing}`}
          >
            Shop listed designs
          </Link>
        </div>
      </section>
    </div>
  );
};
