import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    StarIcon, InstagramIcon, TwitterIcon, FacebookIcon, MailIcon,
    ZapIcon, FlameIcon, Wand2Icon, TagIcon, HeartIcon, RulerIcon, TruckIcon,
    Undo2Icon, HelpCircleIcon, SendIcon, GiftIcon, TrendingUpIcon, BellIcon,
    LightbulbIcon
} from './icons';
import { useCookieConsent } from '../context/CookieConsentContext';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export const Footer: React.FC = () => {
  const [showCookiePreferences, setShowCookiePreferences] = useState(false);
  const { consent, updateConsent } = useCookieConsent();
  return (
    <footer className="bg-brand-surface bg-footer-dots bg-footer-dots-size text-brand-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Top Section: Links & Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          
          {/* Column 1: Brand Info */}
          <div className="flex flex-col">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-display font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Tinge Clothing
              </span>
              <StarIcon className="w-5 h-5 text-yellow-400" />
            </Link>
            <p className="text-sm max-w-xs">
              Your premium destination for quality clothing. Premium threads that match your energy.
            </p>
            <div className="flex items-center gap-3 mt-6">
                <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 text-white hover:opacity-80 transition-opacity"><InstagramIcon className="w-5 h-5" /></a>
                <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-sky-400 text-white hover:opacity-80 transition-opacity"><TwitterIcon className="w-5 h-5" /></a>
                <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-700 text-white hover:opacity-80 transition-opacity"><FacebookIcon className="w-5 h-5" /></a>
                <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-400 text-white hover:opacity-80 transition-opacity"><MailIcon className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Mobile: Shop & Support in 2 columns */}
          <div className="grid grid-cols-2 gap-6 md:hidden col-span-1">
            {/* Column 2: Shop */}
            <div>
              <h4 className="font-display font-bold text-brand-primary text-base mb-3 flex items-center gap-1.5"><ZapIcon className="w-4 h-4 text-brand-accent" /> Shop</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-1.5">
                  <FlameIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/new-arrivals" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">New Arrivals</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <TrendingUpIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/best-sellers" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Best Sellers</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/sale" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Sale Items</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <Wand2Icon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/categories" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">All Products</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Support */}
            <div>
              <h4 className="font-display font-bold text-brand-primary text-base mb-3 flex items-center gap-1.5"><HeartIcon className="w-4 h-4 text-brand-accent" /> Support</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-1.5">
                  <RulerIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/size-guide" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Size Guide</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <TruckIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/shipping" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Shipping Info</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <Undo2Icon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/return-policy" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Return Policy</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <HelpCircleIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/faq" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">FAQ</Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <TruckIcon className="w-3.5 h-3.5 text-brand-secondary"/>
                  <Link to="/guest-order-lookup" className="hover:text-brand-primary transition-colors cursor-pointer text-sm">Track Order</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Desktop: Shop */}
          <div className="hidden md:block">
            <h4 className="font-display font-bold text-brand-primary text-lg mb-4 flex items-center gap-2"><ZapIcon className="w-5 h-5 text-brand-accent" /> Shop</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <FlameIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/new-arrivals" className="hover:text-brand-primary transition-colors cursor-pointer">New Arrivals</Link>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/best-sellers" className="hover:text-brand-primary transition-colors cursor-pointer">Best Sellers</Link>
              </li>
              <li className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/sale" className="hover:text-brand-primary transition-colors cursor-pointer">Sale Items</Link>
              </li>
              <li className="flex items-center gap-2">
                <Wand2Icon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/categories" className="hover:text-brand-primary transition-colors cursor-pointer">All Products</Link>
              </li>
            </ul>
          </div>

          {/* Desktop: Support */}
          <div className="hidden md:block">
            <h4 className="font-display font-bold text-brand-primary text-lg mb-4 flex items-center gap-2"><HeartIcon className="w-5 h-5 text-brand-accent" /> Support</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <RulerIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/size-guide" className="hover:text-brand-primary transition-colors cursor-pointer">Size Guide</Link>
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/shipping" className="hover:text-brand-primary transition-colors cursor-pointer">Shipping Info</Link>
              </li>
              <li className="flex items-center gap-2">
                <Undo2Icon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/return-policy" className="hover:text-brand-primary transition-colors cursor-pointer">Return Policy</Link>
              </li>
              <li className="flex items-center gap-2">
                <HelpCircleIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/faq" className="hover:text-brand-primary transition-colors cursor-pointer">FAQ</Link>
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-brand-secondary"/>
                <Link to="/guest-order-lookup" className="hover:text-brand-primary transition-colors cursor-pointer">Track Order</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="md:col-span-2 lg:col-span-1">
            <h4 className="font-display font-bold text-brand-primary text-lg mb-4 flex items-center gap-2"><MailIcon className="w-5 h-5 text-brand-accent" /> Stay Updated</h4>
            <p className="text-sm mb-4">Get the latest drops, exclusive offers, and design inspiration delivered to your inbox.</p>
            <form className="flex items-center">
              <input type="email" placeholder="Enter your email" className="bg-brand-bg border border-white/20 rounded-l-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
              <button type="submit" className="bg-brand-accent hover:bg-brand-accent-hover text-white px-3 py-2 rounded-r-lg"><SendIcon className="w-5 h-5"/></button>
            </form>
             <ul className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-1 gap-x-4 gap-y-2 mt-4 text-sm">
              <li className="flex items-center gap-2"><GiftIcon className="w-4 h-4 text-green-400"/>Exclusive discounts</li>
              <li className="flex items-center gap-2"><LightbulbIcon className="w-4 h-4 text-blue-400"/>Design tips & inspiration</li>
              <li className="flex items-center gap-2 col-span-2 md:col-span-1 justify-center md:justify-start"><BellIcon className="w-4 h-4 text-yellow-400"/>Early access to new drops</li>
            </ul>
          </div>
        </div>

        {/* Middle Divider & Links */}
        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
          <p className="order-2 md:order-1 text-center md:text-left">&copy; {new Date().getFullYear()} Tinge Clothing. All rights reserved. <span className="inline-flex items-center gap-1">Made with <HeartIcon className="w-4 h-4 text-pink-500 animate-heartbeat inline-block" /> for fashion lovers</span></p>
          <div className="flex flex-wrap gap-4 order-1 md:order-2 justify-center">
            <Link to="/privacy-policy" className="hover:text-brand-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-brand-primary transition-colors">Terms of Service</Link>
            <Link to="/return-policy" className="hover:text-brand-primary transition-colors">Return Policy</Link>
            <Link to="/cookie-policy" className="hover:text-brand-primary transition-colors">Cookie Policy</Link>
            <button
              onClick={() => setShowCookiePreferences(true)}
              className="hover:text-brand-primary transition-colors cursor-pointer"
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showCookiePreferences}
        onClose={() => setShowCookiePreferences(false)}
        onSave={updateConsent}
        currentPreferences={consent}
      />
    </footer>
  );
};