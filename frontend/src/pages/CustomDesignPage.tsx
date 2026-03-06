import React from 'react';
import { Button, Input } from '../components/ui';
import { UploadCloudIcon, LayoutTemplateIcon, CubeIcon, SendIcon } from '../components/icons';

export const CustomDesignPage: React.FC = () => {
    
    const features = [
        {
            icon: <UploadCloudIcon className="w-8 h-8 text-brand-accent"/>,
            title: 'Upload Your Artwork',
            description: 'Bring your vision to life by uploading your own designs, logos, or photos with ease.'
        },
        {
            icon: <LayoutTemplateIcon className="w-8 h-8 text-brand-accent"/>,
            title: 'Exclusive Templates',
            description: 'Don\'t have a design? Choose from our library of professionally crafted, customizable templates.'
        },
        {
            icon: <CubeIcon className="w-8 h-8 text-brand-accent"/>,
            title: 'Live 3D Previews',
            description: 'See your creation from every angle with our interactive 3D mockups before you order.'
        }
    ];

  return (
    <div className="animate-fadeIn">
        <section className="relative min-h-[80vh] bg-cover bg-center flex items-center justify-center text-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=1974&auto=format&fit=crop')" }}>
            <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"></div>
            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-brand-primary">
                <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Coming Soon</span>
                </h1>
                <p className="mt-4 text-2xl md:text-3xl font-display font-semibold">The Ultimate Design Studio</p>
                <p className="mt-4 text-lg max-w-3xl mx-auto text-brand-secondary">
                    Unleash your creativity. Our brand-new custom design tool is under construction and will launch soon. Get ready to design, preview, and order your personalized apparel like never before.
                </p>

                <div className="mt-12 max-w-lg mx-auto">
                    <p className="text-brand-primary font-semibold mb-3">Be the first to know when we launch!</p>
                    <form className="flex items-center" onSubmit={(e) => e.preventDefault()}>
                        <Input type="email" placeholder="Enter your email" className="bg-brand-surface/50 border-white/10 rounded-r-none h-12 text-base"/>
                        <button type="submit" className="bg-brand-accent hover:bg-brand-accent-hover text-white px-5 h-12 rounded-r-lg flex items-center justify-center">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            </div>
        </section>

        <section className="py-16 md:py-24 bg-brand-surface/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-center text-brand-primary">What to Expect</h2>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                    {features.map(feature => (
                        <div key={feature.title} className="flex flex-col items-center">
                            <div className="flex-shrink-0 p-4 bg-brand-surface rounded-full border border-white/10">{feature.icon}</div>
                            <h3 className="mt-5 text-xl font-display font-semibold text-brand-primary">{feature.title}</h3>
                            <p className="mt-2 text-brand-secondary">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    </div>
  );
};
