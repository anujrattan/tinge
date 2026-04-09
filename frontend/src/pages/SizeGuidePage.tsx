import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RulerIcon } from '../components/icons';

export const SizeGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const sizeChart = {
    'T-Shirts & Hoodies': [
      { size: 'S', chest: '36-38"', length: '27"', sleeve: '8.5"' },
      { size: 'M', chest: '40-42"', length: '28"', sleeve: '9"' },
      { size: 'L', chest: '44-46"', length: '29"', sleeve: '9.5"' },
      { size: 'XL', chest: '48-50"', length: '30"', sleeve: '10"' },
      { size: 'XXL', chest: '52-54"', length: '31"', sleeve: '10.5"' },
      { size: '3XL', chest: '56-58"', length: '32"', sleeve: '11"' },
    ],
    'Accessories': [
      { size: 'One Size', description: 'Fits most head sizes (21-24 inches)' },
    ]
  };

  const measuringTips = [
    {
      title: 'Chest',
      description: 'Measure around the fullest part of your chest, keeping the tape measure horizontal.'
    },
    {
      title: 'Length',
      description: 'Measure from the top of the shoulder down to where you want the hem to fall.'
    },
    {
      title: 'Sleeve',
      description: 'Measure from the center of the back of your neck, across your shoulder, and down to your wrist.'
    }
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative bg-brand-surface/30 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <RulerIcon className="w-12 h-12 text-brand-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
              Size Guide
            </h1>
            <p className="mt-4 text-lg text-brand-secondary">
              Find your perfect fit with our comprehensive sizing guide.
            </p>
          </div>
        </div>
      </section>

      {/* Size Charts */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* T-Shirts & Hoodies Chart */}
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">
              T-Shirts & Hoodies
            </h2>
            <div className="bg-brand-surface rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-brand-primary">Size</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-brand-primary">Chest</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-brand-primary">Length</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-brand-primary">Sleeve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {sizeChart['T-Shirts & Hoodies'].map((row, index) => (
                      <tr key={index} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-brand-primary">{row.size}</td>
                        <td className="px-6 py-4 text-sm text-brand-secondary">{row.chest}</td>
                        <td className="px-6 py-4 text-sm text-brand-secondary">{row.length}</td>
                        <td className="px-6 py-4 text-sm text-brand-secondary">{row.sleeve}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Accessories */}
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">
              Accessories
            </h2>
            <div className="bg-brand-surface rounded-xl border border-white/10 p-6">
              {sizeChart['Accessories'].map((item, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <h3 className="font-semibold text-brand-primary mb-2">{item.size}</h3>
                  <p className="text-brand-secondary">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Measuring Tips */}
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">
              How to Measure
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {measuringTips.map((tip, index) => (
                <div
                  key={index}
                  className="bg-brand-surface rounded-xl border border-white/10 p-6"
                >
                  <h3 className="font-semibold text-brand-primary mb-2">{tip.title}</h3>
                  <p className="text-sm text-brand-secondary">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-brand-surface/50 rounded-xl border border-white/10 p-8">
            <h2 className="text-xl font-display font-bold text-brand-primary mb-4">
              Need Help?
            </h2>
            <p className="text-brand-secondary mb-4">
              Still unsure about your size? Our customer service team is here to help you find the perfect fit.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg font-semibold transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

