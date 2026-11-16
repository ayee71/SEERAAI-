/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  alternateLink?: string;
}

export interface CourseWork {
  courseId: string;
  title: string;
  description: string;
  materials?: any[];
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  state: 'PUBLISHED' | 'DRAFT';
}

export const fetchCourses = async (accessToken: string): Promise<ClassroomCourse[]> => {
  try {
    const response = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`);
    }

    const data = await response.json();
    return data.courses || [];
  } catch (error) {
    console.error('Error fetching Classroom courses:', error);
    throw error;
  }
};

export const createCourseWork = async (accessToken: string, courseId: string, coursework: Partial<CourseWork>) => {
  try {
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...coursework,
        workType: coursework.workType || 'ASSIGNMENT',
        state: coursework.state || 'PUBLISHED',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to create coursework: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Classroom coursework:', error);
    throw error;
  }
};

export const createCourseWorkMaterial = async (accessToken: string, courseId: string, material: any) => {
  try {
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(material),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to create coursework material: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Classroom coursework material:', error);
    throw error;
  }
};
