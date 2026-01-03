/**
 * Date/Time Utilities
 * Provides date formatting and time-of-day helpers
 */

/**
 * Date formatting options for IST timezone
 */
export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
};

/**
 * Time formatting options for IST timezone
 */
export const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
};

/**
 * Get time of day string based on hour
 */
export function getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Get time of day with Hindi translation
 */
export function getTimeOfDayHindi(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning (subah)';
    if (hour >= 12 && hour < 17) return 'afternoon (dopahar)';
    if (hour >= 17 && hour < 21) return 'evening (shaam)';
    return 'night (raat)';
}

/**
 * Generate dynamic date context for system prompt
 */
export function generateDateContext(): string {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-IN', DATE_OPTIONS);
    const formattedTime = currentDate.toLocaleTimeString('en-IN', TIME_OPTIONS);
    const hour = currentDate.getHours();
    const timeOfDay = getTimeOfDay(hour);

    return `

═══════════════════════════════════════════════════════════════
## CURRENT DATE & TIME (LIVE - USE THIS!)
═══════════════════════════════════════════════════════════════
📅 DATE: ${formattedDate}
⏰ TIME: ${formattedTime} IST
🌙 TIME OF DAY: ${timeOfDay}
📍 TIMEZONE: Asia/Kolkata (IST)

**USE THIS FOR:**
- Time-aware greetings ("Raat ke 4 baj gaye!" if late night)
- Resume date validation (May 2025 is PAST if current year is 2025 December)
- Urgency context ("Deadline kal hai?" makes sense if you know today's date)
═══════════════════════════════════════════════════════════════
`;
}

/**
 * Format current date for API requests
 */
export function formatCurrentDate(): string {
    return new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    });
}
