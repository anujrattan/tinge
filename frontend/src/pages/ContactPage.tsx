import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { MailIcon, MessageCircleIcon, HelpCircleIcon, TruckIcon } from '../components/icons';

const SUBJECTS = [
  { value: 'order', label: 'Order inquiry' },
  { value: 'shipping', label: 'Shipping and delivery' },
  { value: 'returns', label: 'Returns and exchanges' },
  { value: 'product', label: 'Product question' },
  { value: 'custom-framed-acp', label: 'Custom framed ACP' },
  { value: 'custom-canvas', label: 'Custom canvas' },
  { value: 'custom-sunboard', label: 'Custom sunboard' },
  { value: 'custom-neon', label: 'Custom neon' },
  { value: 'other', label: 'Other' },
];

const STUDIO_EMAIL = 'support@podstore.com';

export const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const incomingSubject = searchParams.get('subject') || '';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: incomingSubject,
    message: searchParams.get('message') || '',
  });
  const [submitted, setSubmitted] = useState(false);
  const subjectOptions = useMemo(() => {
    if (!formData.subject || SUBJECTS.some((option) => option.value === formData.subject)) {
      return SUBJECTS;
    }
    return [{ value: formData.subject, label: formData.subject }, ...SUBJECTS];
  }, [formData.subject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const subjectLabel = subjectOptions.find((option) => option.value === formData.subject)?.label || formData.subject;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = [`Name: ${formData.name}`, `Email: ${formData.email}`, '', formData.message].join('\n');
    const href = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subjectLabel)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setSubmitted(true);
  };

  const contactMethods = [
    {
      icon: <MailIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Email',
      description: 'Write to the studio',
      contact: STUDIO_EMAIL,
      action: `mailto:${STUDIO_EMAIL}`,
    },
    {
      icon: <MessageCircleIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Print types',
      description: 'Compare the four materials',
      contact: 'See what we print',
      action: '/prints',
    },
    {
      icon: <HelpCircleIcon className="w-6 h-6 text-brand-accent" />,
      title: 'FAQ',
      description: 'Sizes, files, and what arrives',
      contact: 'Common questions',
      action: '/faq',
    },
    {
      icon: <TruckIcon className="w-6 h-6 text-brand-accent" />,
      title: 'Shipping',
      description: 'How an order is packed',
      contact: 'Shipping details',
      action: '/shipping',
    },
  ];

  return (
    <div className="animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-brand-surface/30 py-16 border-b border-gray-200 dark:border-white/10">
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
            <Card key={method.action} className="p-6 text-center">
              <div className="flex justify-center mb-4" aria-hidden="true">{method.icon}</div>
              <h3 className="text-lg font-display font-semibold text-brand-primary mb-2">{method.title}</h3>
              <p className="text-base text-brand-secondary mb-3">{method.description}</p>
              {method.action.startsWith('/') ? (
                <Link
                  to={method.action}
                  className="inline-flex min-h-11 items-center text-base font-medium text-brand-accent hover:text-brand-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] rounded-sm"
                >
                  {method.contact}
                </Link>
              ) : (
                <a
                  href={method.action}
                  className="inline-flex min-h-11 items-center text-base font-medium text-brand-accent hover:text-brand-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59] rounded-sm"
                >
                  {method.contact}
                </a>
              )}
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
              <div className="py-4" role="status">
                <h3 className="text-xl font-semibold text-brand-primary mb-2">Your email app should be open.</h3>
                <p className="text-base text-brand-secondary leading-relaxed">
                  If it did not open, copy this and send it to {STUDIO_EMAIL}.
                </p>
                <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-gray-200 bg-brand-bg p-4 text-base text-brand-primary dark:border-white/10">
                  {`Subject: ${subjectLabel}\n\nName: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`}
                </pre>
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
                      className="min-h-12 text-base border-2 border-gray-300 dark:border-white/20 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
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
                      className="min-h-12 text-base border-2 border-gray-300 dark:border-white/20 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
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
                    className="w-full min-h-12 rounded-lg border-2 border-gray-300 dark:border-white/20 bg-brand-surface px-3 py-2 text-base text-brand-primary focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                  >
                    <option value="">Select a subject</option>
                    {subjectOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
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
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-white/20 bg-brand-surface px-3 py-3 text-base text-brand-primary placeholder:text-brand-secondary focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                    placeholder="The material, the size, and the file you will send."
                  />
                  <p className="mt-2 text-sm text-brand-secondary">This opens your email app. It does not send from the website.</p>
                </div>

                <Button type="submit" className="w-full min-h-12 py-3 text-base">
                  Open email
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
};

