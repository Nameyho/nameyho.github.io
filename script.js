// Fonction pour copier une commande spécifique
function copyCommand(button, command) {
    navigator.clipboard.writeText(command).then(() => {
        // Animation de succès
        const originalText = button.textContent;
        button.textContent = '✓ Copié!';
        button.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Erreur lors de la copie: ', err);
        button.textContent = '❌ Erreur';
        setTimeout(() => {
            button.textContent = 'Copier';
        }, 2000);
    });
}

// Smooth scrolling pour la navigation
document.addEventListener('DOMContentLoaded', function() {
    // Navigation principale
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navigation latérale
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Ajouter des boutons de copie aux blocs de code
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
        // Vérifier s'il n'y a pas déjà un bouton de copie
        if (!block.querySelector('.copy-btn')) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.textContent = 'Copier';
            copyButton.onclick = function() {
                const codeText = block.textContent;
                copyCommand(this, codeText);
            };
            block.style.position = 'relative';
            block.appendChild(copyButton);
        }
    });

    // Highlight de la section active dans la sidebar
    const sections = document.querySelectorAll('.section');
    const sidebarLinksArray = Array.from(sidebarLinks);

    function highlightActiveSection() {
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        sidebarLinksArray.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
                link.style.background = 'var(--primary-color)';
                link.style.color = 'white';
            } else {
                link.style.background = '';
                link.style.color = '';
            }
        });
    }

    window.addEventListener('scroll', highlightActiveSection);
    highlightActiveSection(); // Appel initial
});

// Fonction pour ajouter des onglets aux exemples de code (extension future)
function createCodeTabs(containerId, tabs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'code-tabs';
    
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'code-tabs-header';
    
    const tabsContent = document.createElement('div');
    tabsContent.className = 'code-tabs-content';

    tabs.forEach((tab, index) => {
        const tabButton = document.createElement('button');
        tabButton.className = `code-tab ${index === 0 ? 'active' : ''}`;
        tabButton.textContent = tab.title;
        tabButton.onclick = () => switchCodeTab(tabsContent, tabButton, tab.content);
        
        tabsHeader.appendChild(tabButton);

        if (index === 0) {
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';
            codeBlock.innerHTML = `<pre>${tab.content}</pre>`;
            tabsContent.appendChild(codeBlock);
        }
    });

    container.appendChild(tabsHeader);
    container.appendChild(tabsContent);
}

function switchCodeTab(tabsContent, clickedTab, content) {
    // Désactiver tous les onglets
    const allTabs = clickedTab.parentElement.querySelectorAll('.code-tab');
    allTabs.forEach(tab => tab.classList.remove('active'));
    
    // Activer l'onglet cliqué
    clickedTab.classList.add('active');
    
    // Mettre à jour le contenu
    tabsContent.innerHTML = '';
    const codeBlock = document.createElement('div');
    codeBlock.className = 'code-block';
    codeBlock.innerHTML = `<pre>${content}</pre>`;
    tabsContent.appendChild(codeBlock);
}