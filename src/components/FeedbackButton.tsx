import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { sendVectorFeedback } from '../services/vectorFeedbackService';

interface FeedbackButtonProps {
  query: string;
  responseText: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ query, responseText }) => {
  const [feedback, setFeedback] = useState<'thumbs-up' | 'thumbs-down' | null>(null);

  const handleFeedback = async (rating: 'thumbs-up' | 'thumbs-down') => {
    setFeedback(rating);
    try {
      await sendVectorFeedback({ query, responseText, rating });
    } catch (error) {
      console.error('Failed to submit feedback', error);
      setFeedback(null);
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <button 
        onClick={() => handleFeedback('thumbs-up')}
        className={`p-1 rounded ${feedback === 'thumbs-up' ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-400'}`}
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button 
        onClick={() => handleFeedback('thumbs-down')}
        className={`p-1 rounded ${feedback === 'thumbs-down' ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
};
