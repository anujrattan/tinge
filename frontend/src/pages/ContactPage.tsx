import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { MailIcon, MessageCircleIcon, HelpCircleIcon, TruckIcon } from '../components/icons';

export const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const contactMethods = [
    {
      icon: <MailIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Email Us',
      description: 'Get in touch via email',
      contact: 'support@podstore.com',
      action: 'mailto:support@podstore.com'
    },
    {
      icon: <MessageCircleIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Live Chat',
      description: 'Chat with our team',
      contact: 'Available 24/7',
      action: '#'
    },
    {
      icon: <HelpCircleIcon className="w-6 h-6 text-brand-accent" />,
      title: 'FAQ',
      description: 'Find answers quickly',
      contact: 'Common questions',
      action: '#'
    },
    {
      icon: <TruckIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Shipping Info',
      description: 'Track your order',
      contact: 'Order status',
      action: '#'
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative bg-gray-50 dark:bg-brand-surface/30 py-16 border-b border-gray-200 dark:border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-brand-secondary">
              Have a question or need help? We're here for you. Reach out and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactMethods.map((method, index) => (
            <Card key={index} className="p-6 text-center hover:scale-105 transition-transform cursor-pointer">
              <div className="flex justify-center mb-4">{method.icon}</div>
              <h3 className="text-lg font-display font-semibold text-brand-primary mb-2">{method.title}</h3>
              <p className="text-sm text-brand-secondary mb-3">{method.description}</p>
              <a 
                href={method.action} 
                className="text-brand-accent hover:text-brand-accent-hover text-sm font-medium"
                onClick={(e) => {
                  if (method.action === '#') {
                    e.preventDefault();
                  }
                }}
              >
                {method.contact}
              </a>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-display font-bold text-brand-primary mb-6">Send us a Message</h2>
            
            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <MailIcon className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-brand-primary mb-2">Message Sent!</h3>
                <p className="text-brand-secondary">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brand-secondary mb-2">
                      Your Name
                    </label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="border-2 border-gray-300 dark:border-white/20 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-secondary mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="border-2 border-gray-300 dark:border-white/20 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-brand-secondary mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-white/20 bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Inquiry</option>
                    <option value="shipping">Shipping & Delivery</option>
                    <option value="returns">Returns & Exchanges</option>
                    <option value="product">Product Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-brand-secondary mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-white/20 bg-brand-surface px-3 py-2 text-sm text-brand-primary placeholder:text-brand-secondary focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
};

