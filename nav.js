// Shared navigation component for ESP32 LED Grid Controller
class Navigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('about.html')) return 'about';
        if (path.includes('setup.html')) return 'setup';
        return 'home';
    }

    createNavigationHTML() {
        return `
            <nav class="navbar">
                <div class="nav-container">
                    <div class="nav-logo">
                        <h2>ESP32 LED Controller</h2>
                    </div>
                    <div class="nav-menu" id="nav-menu">
                        <a href="index.html" class="nav-link ${this.currentPage === 'home' ? 'active' : ''}">
                            LED Controller
                        </a>
                        <a href="about.html" class="nav-link ${this.currentPage === 'about' ? 'active' : ''}">
                            About
                        </a>
                        <a href="setup.html" class="nav-link ${this.currentPage === 'setup' ? 'active' : ''}">
                            Setup & Help
                        </a>
                    </div>
                    <div class="nav-toggle" id="nav-toggle">
                        <span class="bar"></span>
                        <span class="bar"></span>
                        <span class="bar"></span>
                    </div>
                </div>
            </nav>
        `;
    }

    init() {
        // Insert navigation at the beginning of body
        const navHTML = this.createNavigationHTML();
        document.body.insertAdjacentHTML('afterbegin', navHTML);

        // Add mobile menu toggle functionality
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });

            // Close menu when clicking on a link
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            });
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});