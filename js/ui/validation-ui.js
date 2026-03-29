import { resolveErrorMessage } from '../i18n/error-resolver.js';

// ========== 楠岃瘉UI妯″潡 ==========

// 姝ゆā鍧椾富瑕佽礋璐ｅ鐞嗕笌鐢ㄦ埛鐣岄潰鐩稿叧鐨勯獙璇佹彁绀?
// 绠楁硶楠岃瘉閫昏緫鍦?core 妯″潡涓?

export function showValidationError(error) {
    // 鍒涘缓鎴栨洿鏂伴敊璇樉绀?
    const errorContainer = document.getElementById('validation-error-container') || createErrorContainer();
    const message = resolveErrorMessage(error);
    
    errorContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // 5绉掑悗鑷姩闅愯棌
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

export function clearValidationError() {
    const errorContainer = document.getElementById('validation-error-container');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'validation-error-container';
    container.style.display = 'none';
    
    // 鎻掑叆鍒拌绠楀櫒瀹瑰櫒鐨勯《閮?
    const calculator = document.querySelector('.matrix-calculator');
    if (calculator) {
        calculator.insertBefore(container, calculator.firstChild);
    }
    
    return container;
}
