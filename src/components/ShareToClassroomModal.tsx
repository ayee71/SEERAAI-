import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchCourses, createCourseWork, ClassroomCourse } from '../services/classroomService';
import { X, GraduationCap, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface ShareToClassroomModalProps {
  title: string;
  description: string;
  onClose: () => void;
}

export const ShareToClassroomModal: React.FC<ShareToClassroomModalProps> = ({ title, description, onClose }) => {
  const { accessToken, signIn } = useAuth();
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      loadCourses();
    }
  }, [accessToken]);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      if (accessToken) {
        const data = await fetchCourses(accessToken);
        setCourses(data);
      }
    } catch (err: any) {
      setError(err.message || 'Hojiirra oolchuun hin danda\'amne (Failed to load courses)');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedCourseId || !accessToken) return;

    setSharing(true);
    setError(null);
    try {
      await createCourseWork(accessToken, selectedCourseId, {
        title: `SeeraAI Legal Study: ${title}`,
        description: `${description}\n\nShared via SeeraAI Ethiopian Legal Intelligence platform.`,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED'
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Qooduun hin danda\'amne (Failed to share)');
    } finally {
      setSharing(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-[#1a2332] border border-[#2d3a4f] rounded-2xl p-8 max-w-md w-full text-center">
          <GraduationCap className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Google Classroom</h3>
          <p className="text-gray-400 mb-6">
            Galmee kana barattoota keetiif qooduuf jalqaba Google Classroom keetti seenuu qabda.
            (Sign in to share this with your students.)
          </p>
          <button
            onClick={signIn}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Google'n Seeni
          </button>
          <button
            onClick={onClose}
            className="mt-4 text-gray-500 hover:text-gray-300"
          >
            Dhiisi (Cancel)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1a2332] border border-[#2d3a4f] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#2d3a4f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Google Classroom</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Milkaa'eera!</h4>
              <p className="text-gray-400">Assignment sun Google Classroom irratti qoodameera.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Koorasii Filadhu (Select Course)</label>
                {loading ? (
                  <div className="flex items-center justify-center py-4 bg-black/20 rounded-xl">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : courses.length > 0 ? (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-black/20 border border-[#2d3a4f] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- Filadhu --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} {course.section ? `- ${course.section}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Koorasiin hojjatu hin argamne.
                  </div>
                )}
              </div>

              <div className="bg-black/20 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-bold text-gray-300 mb-1">{title}</h4>
                <p className="text-xs text-gray-500 line-clamp-3">{description}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                disabled={!selectedCourseId || sharing}
                onClick={handleShare}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Qoodi (Share)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
