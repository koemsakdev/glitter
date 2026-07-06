/**
 * Print a single element in isolation (no dashboard chrome, no blank pages).
 *
 * Renders the element's HTML into a hidden iframe together with the page's
 * stylesheets, then prints just that iframe. This avoids the `visibility:hidden`
 * approach, which leaves the hidden layout occupying space and produces extra
 * blank A4 pages.
 */
export function printElement(elementId: string, title?: string): void {
    const node = document.getElementById(elementId);
    if (!node) {
        window.print();
        return;
    }

    // Copy the page's styles so Tailwind classes still apply in the iframe.
    const styles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style'),
    )
        .map((el) => el.outerHTML)
        .join('\n');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        iframe.remove();
        window.print();
        return;
    }

    const safeTitle = (title ?? document.title).replace(/[<>]/g, '');
    doc.open();
    doc.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>${styles}` +
            `<style>@page{margin:12mm;} body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>` +
            `</head><body>${node.outerHTML}</body></html>`,
    );
    doc.close();

    // Give external stylesheets a moment to load before printing.
    const run = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => iframe.remove(), 1000);
    };
    window.setTimeout(run, 350);
}
