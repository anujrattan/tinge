import React, { useState, useEffect, useRef } from 'react';

interface RotatingTextProps {
  words: string[];
  interval?: number;
  className?: string;
  typingSpeed?: number; // Speed in ms per character for typing
}

export const RotatingText: React.FC<RotatingTextProps> = ({ 
  words, 
  interval = 3000,
  className = '',
  typingSpeed = 100 // Default 100ms per character
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (words.length === 0) return;

    const currentWord = words[currentIndex];
    if (!currentWord) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isDeleting) {
      // Typing phase: add characters one by one
      if (displayedText.length < currentWord.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(currentWord.slice(0, displayedText.length + 1));
        }, typingSpeed);
      } else {
        // Word is complete, wait for a pause then start deleting
        const pauseTime = 1000; // Pause 1 second after word is complete
        timeoutRef.current = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      // Deleting phase: remove characters one by one at double speed
      const deleteSpeed = typingSpeed / 2; // Double speed
      
      if (displayedText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -1));
        }, deleteSpeed);
      } else {
        // Text is deleted, move to next word and reset
        setIsDeleting(false);
        setDisplayedText(''); // Reset immediately
        setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayedText, isDeleting, currentIndex, words, typingSpeed]);

  // Calculate max width based on longest word to prevent layout shift
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');
  const maxWidth = longestWord.length * 0.7; // Approximate width in em

  return (
    <span 
      className="inline-block relative" 
      style={{ 
        minWidth: `${maxWidth}em`,
        textAlign: 'left'
      }}
    >
      <span className={`inline-block ${className}`}>
        {displayedText}
        <span className="inline-block ml-0.5 align-middle animate-blink">|</span>
      </span>
    </span>
  );
};
