import React, { useState, useEffect } from 'react';
import { StarIcon } from './icons';
import { Card } from './ui';

interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
}

export const TestimonialsCarousel: React.FC<TestimonialsCarouselProps> = ({ testimonials }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const getCardScale = (index: number) => {
    if (index === activeIndex) return 'scale-100 opacity-100';
    return 'scale-90 opacity-60';
  };

  const getCardZIndex = (index: number) => {
    if (index === activeIndex) return 'z-20';
    return 'z-10';
  };

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Desktop View - Show all with center active */}
      <div className="hidden md:flex items-center justify-center gap-6 px-4">
        {testimonials.map((testimonial, index) => (
          <Card
            key={index}
            onClick={() => goToSlide(index)}
            className={`flex-shrink-0 w-[320px] cursor-pointer transition-all duration-500 ease-out ${getCardScale(index)} ${getCardZIndex(index)} hover:scale-105`}
          >
            <div className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-yellow-400" filled />
                ))}
              </div>
              <p className="text-brand-secondary text-sm md:text-base leading-relaxed mb-4 italic">
                "{testimonial.text}"
              </p>
              <p className="text-brand-primary font-semibold">- {testimonial.name}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Mobile View - Show active with peek of next/prev */}
      <div className="md:hidden relative h-[280px]">
        <div className="absolute inset-0 flex items-center justify-center">
          {testimonials.map((testimonial, index) => {
            const isActive = index === activeIndex;
            const isPrev = index === (activeIndex - 1 + testimonials.length) % testimonials.length;
            const isNext = index === (activeIndex + 1) % testimonials.length;
            
            let transform = 'translateX(0%) scale(0.8)';
            let opacity = '0';
            let zIndex = '0';
            
            if (isActive) {
              transform = 'translateX(0%) scale(1)';
              opacity = '1';
              zIndex = '20';
            } else if (isPrev) {
              transform = 'translateX(-85%) scale(0.85)';
              opacity = '0.5';
              zIndex = '10';
            } else if (isNext) {
              transform = 'translateX(85%) scale(0.85)';
              opacity = '0.5';
              zIndex = '10';
            }

            return (
              <Card
                key={index}
                onClick={() => goToSlide(index)}
                className="absolute w-[280px] cursor-pointer transition-all duration-500 ease-out"
                style={{
                  transform,
                  opacity,
                  zIndex,
                }}
              >
                <div className="p-5">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-yellow-400" filled />
                    ))}
                  </div>
                  <p className="text-brand-secondary text-sm leading-relaxed mb-3 italic line-clamp-4">
                    "{testimonial.text}"
                  </p>
                  <p className="text-brand-primary font-semibold text-sm">- {testimonial.name}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dots Navigation */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === activeIndex
                ? 'w-8 h-2 bg-brand-accent'
                : 'w-2 h-2 bg-brand-secondary/30 hover:bg-brand-secondary/50'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

