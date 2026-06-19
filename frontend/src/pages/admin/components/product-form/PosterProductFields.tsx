import React from 'react';
import { PosterSizesSection } from './PosterSizesSection';
import { PosterFulfillmentPricingSection } from './PosterFulfillmentPricingSection';

type Props = React.ComponentProps<typeof PosterFulfillmentPricingSection> & {
  formData: React.ComponentProps<typeof PosterSizesSection>['formData'];
  setFormData: React.ComponentProps<typeof PosterSizesSection>['setFormData'];
};

/** Composes sizes + fulfillment sections (legacy combined layout). */
export const PosterProductFields: React.FC<Props> = ({ formData, setFormData, onFieldChange }) => (
  <div className="space-y-4">
    <PosterSizesSection formData={formData} setFormData={setFormData} />
    <PosterFulfillmentPricingSection
      formData={formData}
      setFormData={setFormData}
      onFieldChange={onFieldChange}
    />
  </div>
);

export { PosterSizesSection } from './PosterSizesSection';
export { PosterFulfillmentPricingSection } from './PosterFulfillmentPricingSection';
