// Configuration globale
const CONFIG = {
    smoothScroll: true,
    autoHighlight: true,
    copyButtons: true,
    animations: true
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeSmoothScroll();
    initializeCopyButtons();
    initializeSidebarHighlight();
    initializeAnimations();
    initializeNavigation();
});

// Navigation fluide
function initializeSmoothScroll() {
    if (!CONFIG.smoothScroll) return;

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const navHeight = document.querySelector('nav').offsetHeight;
                const offset = headerHeight + navHeight + 20;
                
                const targetPosition = targetSection.offsetTop - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Mettre à jour l'URL sans recharger la page
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Boutons de copie pour les blocs de code
function initializeCopyButtons() {
    if (!CONFIG.copyButtons) return;

    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
        if (!block.querySelector('.copy-btn')) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copier';
            copyButton.onclick = () => copyCodeBlock(block, copyButton);
            
            block.style.position = 'relative';
            block.appendChild(copyButton);
        }
    });
}

// Fonction de copie améliorée
function copyCodeBlock(block, button) {
    const codeText = block.textContent.replace(/Copier/g, '').trim();
    
    navigator.clipboard.writeText(codeText).then(() => {
        showCopySuccess(button);
    }).catch(err => {
        showCopyError(button);
        console.error('Erreur lors de la copie: ', err);
    });
}

function showCopySuccess(button) {
    const originalHTML = button.innerHTML;
    const originalBackground = button.style.background;
    
    button.innerHTML = '<i class="fas fa-check"></i> Copié!';
    button.style.background = 'var(--success-color)';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = originalBackground;
    }, 2000);
}

function showCopyError(button) {
    const originalHTML = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-times"></i> Erreur';
    button.style.background = 'var(--danger-color)';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = '';
    }, 2000);
}

// Highlight de la section active dans la sidebar
function initializeSidebarHighlight() {
    if (!CONFIG.autoHighlight) return;

    const sections = document.querySelectorAll('.section');
    const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');
    
    function highlightActiveSection() {
        let currentSection = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    // Observer les changements de section
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                sidebarLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    window.addEventListener('scroll', highlightActiveSection);
    highlightActiveSection(); // Appel initial
}

// Animations au défilement
function initializeAnimations() {
    if (!CONFIG.animations) return;

    const animatedElements = document.querySelectorAll('.section, .step, .feature-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Navigation améliorée
function initializeNavigation() {
    // Highlight de la navigation principale au scroll
    const navSections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    function updateNavHighlight() {
        let currentNavSection = '';
        const scrollPosition = window.scrollY + 200;
        
        navSections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollPosition >= sectionTop) {
                currentNavSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            const linkSection = link.getAttribute('href').substring(1);
            if (linkSection === currentNavSection) {
                link.style.background = 'rgba(255, 255, 255, 0.15)';
                link.style.color = 'var(--primary-color)';
            } else {
                link.style.background = '';
                link.style.color = '';
            }
        });
    }

    window.addEventListener('scroll', updateNavHighlight);
}

// Fonction pour créer des onglets de code
function createCodeTabs(containerId, tabs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'code-tabs-container';
    
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'code-tabs-header';
    
    const tabsContent = document.createElement('div');
    tabsContent.className = 'code-tabs-content';

    tabs.forEach((tab, index) => {
        const tabButton = document.createElement('button');
        tabButton.className = `code-tab ${index === 0 ? 'active' : ''}`;
        tabButton.textContent = tab.title;
        tabButton.onclick = () => switchCodeTab(tabsContent, tabButton, tab.content, tabs);
        
        tabsHeader.appendChild(tabButton);

        if (index === 0) {
            const codeBlock = createCodeBlock(tab.content);
            tabsContent.appendChild(codeBlock);
        }
    });

    tabsContainer.appendChild(tabsHeader);
    tabsContainer.appendChild(tabsContent);
    container.appendChild(tabsContainer);
}

function createCodeBlock(content) {
    const codeBlock = document.createElement('div');
    codeBlock.className = 'code-block';
    codeBlock.innerHTML = `<pre>${content}</pre>`;
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copier';
    copyButton.onclick = () => copyCodeBlock(codeBlock, copyButton);
    
    codeBlock.appendChild(copyButton);
    return codeBlock;
}

function switchCodeTab(tabsContent, clickedTab, content, tabs) {
    // Désactiver tous les onglets
    const allTabs = clickedTab.parentElement.querySelectorAll('.code-tab');
    allTabs.forEach(tab => tab.classList.remove('active'));
    
    // Activer l'onglet cliqué
    clickedTab.classList.add('active');
    
    // Mettre à jour le contenu
    tabsContent.innerHTML = '';
    const codeBlock = createCodeBlock(content);
    tabsContent.appendChild(codeBlock);
}

// Fonction de recherche dans la sidebar
function initializeSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'sidebar-search';
    searchContainer.innerHTML = `
        <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Rechercher dans le guide..." id="sidebarSearch">
        </div>
    `;

    const sidebar = document.querySelector('.sidebar');
    sidebar.insertBefore(searchContainer, sidebar.querySelector('h3').nextSibling);

    const searchInput = document.getElementById('sidebarSearch');
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        sidebarLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                link.style.display = 'flex';
            } else {
                link.style.display = 'none';
            }
        });
    });
}

// Mode sombre (optionnel)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Charger le mode somme si activé précédemment
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Exporter les fonctions globales
window.createCodeTabs = createCodeTabs;
window.toggleDarkMode = toggleDarkMode;