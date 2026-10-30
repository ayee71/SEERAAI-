import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PasscodeEntryComponentProps {
  onSuccess: () => void;
}

export const PasscodeEntryComponent: React.FC<PasscodeEntryComponentProps> = ({ onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const { profile, updateProfile } = useAuth();

  const handleVerify = async () => {
    // Basic client-side check (or Firestore-based hash check)
    // For now, let's implement a simple check
    if (!profile) return;

    // Simulate hashing check
    if (passcode === '2026') { // This should be replaced by a proper hash check
      onSuccess();
    } else {
      setError('Incorrect passcode');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Enter Passcode</h2>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="p-2 border rounded mb-4"
        placeholder="Enter your code"
      />
      <button onClick={handleVerify} className="p-2 bg-blue-500 text-white rounded">
        Unlock
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};
