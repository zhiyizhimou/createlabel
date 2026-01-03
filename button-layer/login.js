// 登录功能模块
class LoginManager {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.createLoginModal();
        this.setupEventListeners();
        this.checkExistingLogin();
    }

    createLoginModal() {
        // 创建登录模态框HTML结构
        const loginModalHTML = `
            <div id="login-modal" class="login-modal">
                <div class="login-content">
                    <div class="login-header">
                        <h2>欢迎回来</h2>
                        <p>登录以使用完整功能</p>
                    </div>
                    <div class="login-body">
                        <form id="login-form" class="login-form">
                            <div class="form-group">
                                <label for="username">用户名</label>
                                <input type="text" id="username" name="username" required placeholder="请输入用户名">
                                <div class="error-message" id="username-error">用户名不能为空</div>
                            </div>
                            <div class="form-group">
                                <label for="password">密码</label>
                                <input type="password" id="password" name="password" required placeholder="请输入密码">
                                <div class="error-message" id="password-error">密码不能为空</div>
                            </div>
                            <div class="login-actions">
                                <button type="submit" class="login-btn" id="submit-login">
                                    <span>登录</span>
                                    <div class="loading-spinner" id="login-spinner">
                                        <div class="spinner"></div>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                    <div class="login-footer">
                        <p>还没有账号？<a href="#" id="register-link">立即注册</a></p>
                    </div>
                </div>
            </div>
        `;

        // 添加到body
        document.body.insertAdjacentHTML('beforeend', loginModalHTML);
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
        const loginForm = document.getElementById('login-form');
        const closeModal = document.querySelector('.login-modal');
        const registerLink = document.getElementById('register-link');

        // 登录按钮点击事件
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.isLoggedIn) {
                    this.logout();
                } else {
                    this.showLoginModal();
                }
            });
        }

        // 点击模态框外部关闭
        if (closeModal) {
            closeModal.addEventListener('click', (e) => {
                if (e.target === closeModal) {
                    this.hideLoginModal();
                }
            });
        }

        // 登录表单提交
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 注册链接
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterMessage();
            });
        }

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && loginModal.style.display === 'block') {
                this.hideLoginModal();
            }
        });
    }

    showLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'block';
            document.getElementById('username').focus();
        }
    }

    hideLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'none';
            this.clearForm();
        }
    }

    clearForm() {
        const form = document.getElementById('login-form');
        if (form) form.reset();
        
        this.hideError('username-error');
        this.hideError('password-error');
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // 验证输入
        if (!this.validateInput(username, password)) {
            return;
        }

        this.showLoading(true);

        try {
            // 模拟登录请求
            const success = await this.mockLoginRequest(username, password);
            
            if (success) {
                this.loginSuccess(username);
            } else {
                this.showError('login-error', '用户名或密码错误');
            }
        } catch (error) {
            this.showError('login-error', '登录失败，请检查网络连接');
        } finally {
            this.showLoading(false);
        }
    }

    validateInput(username, password) {
        let isValid = true;

        if (!username) {
            this.showError('username-error', '用户名不能为空');
            isValid = false;
        } else {
            this.hideError('username-error');
        }

        if (!password) {
            this.showError('password-error', '密码不能为空');
            isValid = false;
        } else {
            this.hideError('password-error');
        }

        return isValid;
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 添加错误样式到对应的输入框
            const inputId = elementId.replace('-error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }

    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.style.display = 'none';
            
            const inputId = elementId.replace('-error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }
    }

    mockLoginRequest(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // 模拟登录验证（实际项目中应该调用后端API）
                const validUsers = {
                    'a': '123456',
                };
                
                resolve(validUsers[username] === password);
            }, 1500);
        });
    }

    loginSuccess(username) {
        this.isLoggedIn = true;
        this.currentUser = {
            username: username,
            avatar: username.charAt(0).toUpperCase()
        };
        
        this.saveLoginState();
        this.updateUI();
        this.hideLoginModal();
        
        // 显示成功消息
        this.showSuccessMessage(`欢迎回来，${username}！`);
    }

    logout() {
        if (confirm('确定要退出登录吗？')) {
            this.isLoggedIn = false;
            this.currentUser = null;
            this.clearLoginState();
            this.updateUI();
            this.showSuccessMessage('已成功退出登录');
        }
    }

    saveLoginState() {
        if (this.isLoggedIn && this.currentUser) {
            localStorage.setItem('medical-annotator-login', JSON.stringify({
                user: this.currentUser,
                timestamp: Date.now()
            }));
        }
    }

    clearLoginState() {
        localStorage.removeItem('medical-annotator-login');
    }

    checkExistingLogin() {
        const savedLogin = localStorage.getItem('medical-annotator-login');
        if (savedLogin) {
            try {
                const loginData = JSON.parse(savedLogin);
                // 检查登录是否在24小时内
                if (Date.now() - loginData.timestamp < 24 * 60 * 60 * 1000) {
                    this.isLoggedIn = true;
                    this.currentUser = loginData.user;
                    this.updateUI();
                }
            } catch (error) {
                this.clearLoginState();
            }
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        if (!loginBtn) return;

        if (this.isLoggedIn && this.currentUser) {
            loginBtn.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${this.currentUser.avatar}</div>
                    <span>${this.currentUser.username}</span>
                </div>
            `;
            loginBtn.classList.add('logged-in');
            loginBtn.title = '点击退出登录';
        } else {
            loginBtn.innerHTML = '登录';
            loginBtn.classList.remove('logged-in');
            loginBtn.title = '点击登录';
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('login-spinner');
        const submitBtn = document.getElementById('submit-login');
        
        if (spinner && submitBtn) {
            spinner.style.display = show ? 'block' : 'none';
            submitBtn.disabled = show;
        }
    }

    showSuccessMessage(message) {
        // 可以在状态栏显示成功消息
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
            const originalText = statusBar.innerHTML;
            statusBar.innerHTML = `<span style="color: var(--accent);">${message}</span>`;
            
            setTimeout(() => {
                statusBar.innerHTML = originalText;
            }, 3000);
        }
    }

    showRegisterMessage() {
        alert('注册功能即将开放，目前支持以下测试账号：\n\n用户名: a\n密码: 123456');
    }
}

// 导出登录管理器
export default LoginManager;

// 初始化函数
export function initLogin() {
    window.loginManager = new LoginManager();
    return window.loginManager;
}
