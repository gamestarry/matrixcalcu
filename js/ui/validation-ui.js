// ========== 验证UI模块 ==========

// 此模块主要负责处理与用户界面相关的验证提示
// 算法验证逻辑在 core 模块中

export function showValidationError(error) {
    // 创建或更新错误显示
    const errorContainer = document.getElementById('validation-error-container') || createErrorContainer();
    
    errorContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            ${error.message}
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // 5秒后自动隐藏
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
    
    // 插入到计算器容器的顶部
    const calculator = document.querySelector('.matrix-calculator');
    if (calculator) {
        calculator.insertBefore(container, calculator.firstChild);
    }
    
    return container;
}