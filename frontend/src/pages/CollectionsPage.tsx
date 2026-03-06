import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Collection } from "../types";
import api from "../services/api";
import { Button, Card } from "../components/ui";
import { ArrowRightIcon, TagIcon } from "../components/icons";
import { SEOHead } from "../components/SEOHead";

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const data = await api.getCollections();
        // Only show active collections, sorted by sortOrder then name
        const visible = data
          .filter((c) => c.isActive !== false)
          .sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          });
        setCollections(visible);
      } catch (err: any) {
        setError(err?.message || "Failed to load collections.");
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);

  return (
    <div className="animate-fadeIn pb-16">
      <SEOHead
        title="Collections | Tinge Clothing"
        description="Explore curated merchandise collections like The Streetwear Edit, The Essentials, and more."
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="mb-12 text-left">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary mb-2">
            Shop By{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Collection
            </span>
          </h1>
          <p className="text-brand-secondary font-sans">
            Explore our curated drops – each collection blends styles, colors, and fits across product types.
          </p>
        </div>
      </div>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        {error && (
          <div className="mb-6 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-48 bg-white/10 rounded-lg mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <Card className="p-10 text-center">
            <TagIcon className="w-12 h-12 mx-auto mb-4 text-brand-secondary opacity-60" />
            <h2 className="text-xl font-display font-semibold text-brand-primary mb-2">
              No collections live yet
            </h2>
            <p className="text-brand-secondary mb-6">
              We’re curating our first drops. Check back soon for The Streetwear Edit, Essentials, and more.
            </p>
            <Button onClick={() => navigate("/")}>
              Browse all products
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                onClick={() => navigate(`/collections/${collection.slug}`)}
              >
                <div className="relative h-56 overflow-hidden">
                  {collection.imageUrl ? (
                    <img
                      src={collection.imageUrl}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 flex items-center justify-center">
                      <TagIcon className="w-10 h-10 text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-1">
                      Collection
                    </p>
                    <h2 className="text-2xl font-display font-bold text-white">
                      {collection.name}
                    </h2>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-brand-secondary line-clamp-2">
                    {collection.description ||
                      "A tightly curated mix of fits, colors, and textures designed to work together."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/collections/${collection.slug}`);
                    }}
                  >
                    View drop
                    <ArrowRightIcon className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
