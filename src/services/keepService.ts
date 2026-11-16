/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KeepNote {
  id: string;
  title: string;
  body?: string;
  attachments?: any[];
}

export const fetchKeepNotes = async (accessToken: string): Promise<KeepNote[]> => {
  try {
    // Note: Google Keep API for personal accounts is restricted.
    // For Workspace accounts, it works via the Keep REST API.
    const response = await fetch('https://keep.googleapis.com/v1/notes', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Google Keep API access is restricted. This typically requires a Google Workspace account.');
      }
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.notes || [];
  } catch (error) {
    console.error('Error fetching Keep notes:', error);
    throw error;
  }
};

export const createKeepNote = async (accessToken: string, note: { title: string; text: string }) => {
  try {
    const response = await fetch('https://keep.googleapis.com/v1/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: note.title,
        body: {
          text: {
            text: note.text
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to create note: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Keep note:', error);
    throw error;
  }
};

/**
 * Syncs local notes to Google Keep.
 * This is a simplified version that just pushes unsynced notes.
 */
export const syncNotesToKeep = async (accessToken: string, notes: { title: string; content: string }[]) => {
  const results = [];
  for (const note of notes) {
    try {
      const result = await createKeepNote(accessToken, { title: note.title, text: note.content });
      results.push({ success: true, note: result });
    } catch (e) {
      results.push({ success: false, error: e });
    }
  }
  return results;
};
