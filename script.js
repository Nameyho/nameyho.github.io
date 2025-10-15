// Liste de tous les IDs des cases à cocher
const checklistItems = [
    'step1', 'step2', 'step3', 'step4', 'step5',
    'step6', 'step7', 'step8', 'step9', 'step10',
    'step11', 'step12', 'step13', 'step14', 'step15'
];

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

// Fonction pour mettre à jour la barre de progression
function updateProgress() {
    const totalItems = checklistItems.length;
    let completedItems = 0;
    
    checklistItems.forEach(id => {
        if (document.getElementById(id).checked) {
            completedItems++;
        }
    });
    
    const percentage = (completedItems / totalItems) * 100;
    document.getElementById('progress-bar').style.width = percentage + '%';
    document.getElementById('progress-text').textContent = Math.round(percentage) + '% complété';
    
    // Mettre à jour l'apparence des éléments cochés
    checklistItems.forEach(id => {
        const item = document.getElementById(id).closest('.checklist-item');
        if (document.getElementById(id).checked) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}

// Fonction pour tout cocher
function checkAll() {
    checklistItems.forEach(id => {
        document.getElementById(id).checked = true;
    });
    updateProgress();
}

// Fonction pour tout décocher
function uncheckAll() {
    checklistItems.forEach(id => {
        document.getElementById(id).checked = false;
    });
    updateProgress();
}

// Initialiser la progression au chargement de la page
document.addEventListener('DOMContentLoaded', updateProgress);