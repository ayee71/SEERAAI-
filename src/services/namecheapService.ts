import axios from 'axios';

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: string;
  currency?: string;
}

export const checkDomainAvailability = async (domain: string): Promise<DomainCheckResult> => {
  try {
    const response = await axios.post('/api/namecheap/check-domain', { domain });
    return response.data;
  } catch (error: any) {
    console.error('Error checking domain availability:', error);
    throw new Error(error.response?.data?.error || 'Failed to check domain availability');
  }
};

export const getDomainSuggestions = async (keyword: string): Promise<string[]> => {
  try {
    const response = await axios.post('/api/namecheap/suggestions', { keyword });
    return response.data.suggestions || [];
  } catch (error: any) {
    console.error('Error getting domain suggestions:', error);
    return [];
  }
};
