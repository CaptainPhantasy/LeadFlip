// src/lib/discovery/config.ts
// Service categories configuration for Business Discovery System

export const SERVICE_CATEGORIES = {
  // High Priority (Launch First)
  plumbing: {
    googlePlacesType: 'plumber',
    displayName: 'Plumbing',
    keywords: ['plumber', 'plumbing service', 'emergency plumber'],
    priority: 'high',
    phase: 1
  },
  hvac: {
    googlePlacesType: 'hvac_contractor',
    displayName: 'HVAC',
    keywords: ['hvac', 'heating', 'air conditioning', 'furnace'],
    priority: 'high',
    phase: 1
  },
  electrical: {
    googlePlacesType: 'electrician',
    displayName: 'Electrical',
    keywords: ['electrician', 'electrical service', 'wiring'],
    priority: 'high',
    phase: 1
  },
  roofing: {
    googlePlacesType: 'roofing_contractor',
    displayName: 'Roofing',
    keywords: ['roofing', 'roof repair', 'roof replacement'],
    priority: 'high',
    phase: 1
  },

  // Medium Priority (Month 2)
  landscaping: {
    googlePlacesType: 'landscaper',
    displayName: 'Landscaping/Lawn Care',
    keywords: ['landscaping', 'lawn care', 'lawn mowing', 'yard work'],
    priority: 'medium',
    phase: 2
  },
  pest_control: {
    googlePlacesType: 'pest_control_service',
    displayName: 'Pest Control',
    keywords: ['pest control', 'exterminator', 'termite control'],
    priority: 'medium',
    phase: 2
  },
  cleaning: {
    googlePlacesType: 'house_cleaning_service',
    displayName: 'Cleaning Services',
    keywords: ['cleaning service', 'house cleaning', 'maid service'],
    priority: 'medium',
    phase: 2
  },
  painting: {
    googlePlacesType: 'painter',
    displayName: 'Painting',
    keywords: ['painting', 'house painter', 'interior painting'],
    priority: 'medium',
    phase: 2
  },

  // Lower Priority (Expand Later)
  carpentry: {
    googlePlacesType: 'carpenter',
    displayName: 'Carpentry/Handyman',
    keywords: ['carpenter', 'handyman', 'handyman service'],
    priority: 'low',
    phase: 3
  },
  appliance_repair: {
    googlePlacesType: 'appliance_repair_service',
    displayName: 'Appliance Repair',
    keywords: ['appliance repair', 'refrigerator repair', 'washer repair'],
    priority: 'low',
    phase: 3
  },
  general_contractor: {
    googlePlacesType: 'general_contractor',
    displayName: 'General Contractors',
    keywords: ['general contractor', 'home remodeling', 'renovation'],
    priority: 'low',
    phase: 3
  }
} as const;
