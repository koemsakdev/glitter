/**
 * Device details sent with a dashboard sign-in, for the security log
 * (helps tell a staff member's usual machine from a stranger's).
 * Nothing personal — just what the browser already exposes.
 */
export function collectClientInfo(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        userAgentData?: { platform?: string };
    };
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: nav.language,
        languages: nav.languages?.slice(0, 5),
        screen: `${window.screen.width}×${window.screen.height}`,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        platform: nav.userAgentData?.platform ?? nav.platform,
        touch: nav.maxTouchPoints > 0,
        colorDepth: window.screen.colorDepth,
        deviceMemory: nav.deviceMemory,
        cores: nav.hardwareConcurrency,
    };
}
