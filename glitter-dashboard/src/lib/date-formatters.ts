const KHMER_WEEKDAYS = [
    'ថ្ងៃអាទិត្យ',
    'ថ្ងៃច័ន្ទ',
    'ថ្ងៃអង្គារ',
    'ថ្ងៃពុធ',
    'ថ្ងៃព្រហស្បតិ៍',
    'ថ្ងៃសុក្រ',
    'ថ្ងៃសៅរ៍',
];

const KHMER_MONTHS = [
    'មករា',
    'កុម្ភៈ',
    'មីនា',
    'មេសា',
    'ឧសភា',
    'មិថុនា',
    'កក្កដា',
    'សីហា',
    'កញ្ញា',
    'តុលា',
    'វិច្ឆិកា',
    'ធ្នូ',
];

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

function toKhmerNumber(n: number): string {
    return String(n)
        .split('')
        .map((c) => {
            const i = parseInt(c, 10);
            return Number.isNaN(i) ? c : KHMER_DIGITS[i];
        })
        .join('');
}

/**
 * Format a date as "Tuesday, May 26" (en) or "ថ្ងៃអង្គារ ទី២៦ ឧសភា" (km).
 */
export function formatLongDate(date: Date, language: 'en' | 'km'): string {
    if (language === 'km') {
        const weekday = KHMER_WEEKDAYS[date.getDay()];
        const day = toKhmerNumber(date.getDate());
        const month = KHMER_MONTHS[date.getMonth()];
        return `${weekday} ទី${day} ${month}`;
    }
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(date);
}