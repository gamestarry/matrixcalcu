// js/utils/math-loader.js
export function ensureMathJsLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof math !== 'undefined' && math.fraction) {
            resolve(math);
            return;
        }
        
        // 尝试加载 math.js
        const script = document.createElement('script');
        script.src = '/math.min.js';
        script.onload = () => {
            if (typeof math !== 'undefined') {
                console.log('math.js loaded successfully');
                resolve(math);
            } else {
                reject(new Error('math.js loaded but not defined'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load math.js'));
        document.head.appendChild(script);
    });
}