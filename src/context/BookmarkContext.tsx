import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BookmarkItem {
  id: string;
  type: string;
  title: string;
  note?: string;
  timestamp?: string;
}

export interface BookmarkContextType {
  bookmarks: BookmarkItem[];
  toggleBookmark: (item: BookmarkItem) => void;
  isBookmarked: (id: string) => boolean;
  removeBookmark: (id: string) => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('seera_ai_user_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('seera_ai_user_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Failed to save bookmarks', e);
    }
  }, [bookmarks]);

  const isBookmarked = (id: string) => bookmarks.some((b) => b.id === id);

  const toggleBookmark = (item: BookmarkItem) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === item.id)) {
        return prev.filter((b) => b.id !== item.id);
      } else {
        return [...prev, { ...item, timestamp: new Date().toISOString() }];
      }
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, toggleBookmark, isBookmarked, removeBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = (): BookmarkContextType => {
  const context = useContext(BookmarkContext);
  if (!context) {
    return {
      bookmarks: [],
      toggleBookmark: () => {},
      isBookmarked: () => false,
      removeBookmark: () => {},
    };
  }
  return context;
};
