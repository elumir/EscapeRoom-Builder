export function generateUUID(): string {
    // A simple UUID generator that works in insecure contexts.
    // `crypto.randomUUID()` is only available in secure contexts (HTTPS/localhost).
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Basic fallback for insecure contexts or older browsers.
    // Courtesy of https://stackoverflow.com/a/2117523
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
