/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startTime: string; // ISO format or YYYY-MM-DDTHH:MM:SS
  endTime: string;
  location?: string;
}

export function downloadIcsFile(event: CalendarEvent) {
  // Use startTime/endTime for full calendar events
  const start = event.startTime.replace(/[-:]/g, '').replace('T', 'T');
  const end = event.endTime.replace(/[-:]/g, '').replace('T', 'T');
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SeeraAI Ethiopian Legal Intelligence//Court Hearing Reminder//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `DTSTART:${start}Z`,
    `DTEND:${end}Z`,
    `LOCATION:${event.location || 'Mana Murtii (Courtroom)'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Court_Hearing_${event.startTime.split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
