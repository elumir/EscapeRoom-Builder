import { useEffect, useState } from 'react';
import * as gameService from '../services/presentationService';
import type { Asset } from '../types';

interface FontLoaderProps {
    gameId: string | undefined;
}

const getFontFormat = (mimeType: string) => {
    if (mimeType === 'font/woff2') return 'woff2';
    if (mimeType === 'font/woff') return 'woff';
    if (mimeType === 'font/ttf' || mimeType === 'application/font-sfnt' || mimeType === 'application/x-font-truetype') return 'truetype';
    if (mimeType === 'font/otf' || mimeType === 'application/font-sfnt' || mimeType === 'application/x-font-opentype') return 'opentype';
    return null;
};

const FontLoader: React.FC<FontLoaderProps> = ({ gameId }) => {
    const [styleSheet, setStyleSheet] = useState<HTMLStyleElement | null>(null);

    useEffect(() => {
        if (!gameId) return;

        let isMounted = true;
        
        // Create a style element and add it to the head
        const style = document.createElement('style');
        document.head.appendChild(style);
        setStyleSheet(style);

        const fetchAndInjectFonts = async () => {
            try {
                const assets = await gameService.getAssetsForGame(gameId);
                if (!isMounted) return;

                const fontAssets = assets.filter(asset => asset.mime_type.startsWith('font/'));
                if (fontAssets.length === 0) return;

                const fontFaceRules = fontAssets.map(asset => {
                    const format = getFontFormat(asset.mime_type);
                    if (!format) return '';

                    const url = `${gameService.API_BASE_URL}/assets/${asset.id}`;
                    
                    // Sanitize font name for CSS
                    const fontFamily = asset.name.replace(/[^a-zA-Z0-9\s-]/g, '');
                    
                    return `
                        @font-face {
                            font-family: '${fontFamily}';
                            src: url('${url}') format('${format}');
                            font-weight: normal;
                            font-style: normal;
                        }
                    `;
                }).join('\n');

                if (isMounted && style) {
                    style.innerHTML = fontFaceRules;
                }
            } catch (error) {
                console.error("Failed to load game fonts:", error);
            }
        };

        fetchAndInjectFonts();

        return () => {
            isMounted = false;
            // Cleanup: remove the style element when the component unmounts
            if (style) {
                document.head.removeChild(style);
            }
        };
    }, [gameId]);

    // This component doesn't render anything itself
    return null;
};

export default FontLoader;
