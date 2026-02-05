// ==================== CATEGORY CONFIGURATION ====================
const CATEGORY_CONFIG = {
    "Flight Plan": {
        icon: "fa-route",
        color: "#0056a6"
    },
    "IFR Comms": {
        icon: "fa-headset",
        color: "#28a745"
    },
    "Mass And Balance": {
        icon: "fa-weight-scale",
        color: "#dc3545"
    },
    "OPS": {
        icon: "fa-clipboard-check",
        color: "#6f42c1"
    },
    "Performance": {
        icon: "fa-chart-line",
        color: "#fd7e14"
    },
    "RNAV": {
        icon: "fa-satellite-dish",
        color: "#17a2b8"
    },
    "VFR Comms": {
        icon: "fa-tower-broadcast",
        color: "#20c997"
    }
};

// Application State
let allQuestions = [];
let currentCategory = "";
let categoryQuestions = [];
let currentQuestionIndex = 0;
let userScore = { correct: 0, attempted: 0 };
let questionShuffledState = new Map();
let searchResults = [];
let isSearchActive = false;

// ==================== HELPER FUNCTIONS ====================
function extractImageName(imagePath) {
    if (!imagePath) return '';
    
    // Get just the filename from the path
    const fileName = imagePath.split('/').pop();
    
    // Remove file extension (jpg, jpeg, png, gif, etc.)
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    
    // Clean up: replace underscores and hyphens with spaces, and capitalize words
    return nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
        .trim();
}

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', function() {
    console.log("ETIHAD CP Aviation System Initializing...");
    initializeSystem();
    
    // Add search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            performSearch(e.target.value);
        });
    }
    
    // Add search toggle listener
    const searchToggle = document.getElementById('searchAnswersToggle');
    if (searchToggle) {
        searchToggle.addEventListener('change', function() {
            if (searchInput.value.trim() !== '') {
                performSearch(searchInput.value);
            }
        });
    }
});

// ==================== SYSTEM INITIALIZATION ====================
async function initializeSystem() {
    console.log("Loading questions database...");
    try {
        const response = await fetch('questions.csv');
        if (response.ok) {
            const csvData = await response.text();
            allQuestions = processCSV(csvData);
            console.log(`✓ Loaded ${allQuestions.length} questions`);
            updateQuestionCount();
            displayCategories();
            showMessage("System ready. Select a category to begin.", "success");
        } else {
            console.log("CSV file not found, loading sample data");
            loadSampleData();
        }
    } catch (error) {
        console.error("Error loading questions:", error);
        loadSampleData();
    }
}

function processCSV(csvText) {
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row || row === '') continue;
        
        try {
            const columns = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of row) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    columns.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            columns.push(current);
            
            if (columns.length >= 7) {
                let correctIndex = parseInt(columns[6].trim()) - 1;
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                    correctIndex = 0;
                }
                
                let imagePath = '';
                if (columns.length > 7 && columns[7]) {
                    imagePath = columns[7].trim();
                    if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('./')) {
                        imagePath = './' + imagePath;
                    }
                }
                
                let explanation = '';
                if (columns.length > 8 && columns[8]) {
                    explanation = columns[8].trim();
                }
                
                const question = {
                    id: `q${i}`,
                    category: columns[0].trim(),
                    text: columns[1].trim(),
                    originalOptions: [
                        columns[2].trim(),
                        columns[3].trim(),
                        columns[4].trim(),
                        columns[5].trim()
                    ],
                    originalCorrect: correctIndex,
                    image: imagePath,
                    explanation: explanation,
                    currentOptions: null,
                    currentCorrect: null
                };
                
                question.currentOptions = [...question.originalOptions];
                question.currentCorrect = question.originalCorrect;
                
                if (question.text && question.originalOptions[0]) {
                    questions.push(question);
                }
            }
        } catch (e) {
            console.warn(`Error parsing line ${i}:`, e);
        }
    }
    
    return questions;
}

function loadSampleData() {
    console.log("Loading sample aviation questions...");
    
    allQuestions = [
        {
            id: "q1",
            category: "Flight Plan",
            text: "What does this flight planning chart show?",
            originalOptions: ["Standard instrument departure", "Enroute navigation chart", "Standard terminal arrival", "Weather minimums chart"],
            originalCorrect: 0,
            image: "./images/Flight Plan/070-01.jpg",
            explanation: "This is a Standard Instrument Departure (SID) chart.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q2",
            category: "Flight Plan",
            text: "What is the minimum fuel required for an IFR flight?",
            originalOptions: ["Fuel to destination only", "Fuel to destination plus 30 minutes", "Fuel to alternate plus 30 minutes", "Fuel to destination plus alternate plus 45 minutes"],
            originalCorrect: 3,
            image: "",
            explanation: "FAR 91.167 requires fuel to destination, then to alternate, plus 45 minutes reserve.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q3",
            category: "IFR Comms",
            text: "What phrase should be used to acknowledge an altitude assignment?",
            originalOptions: ["Roger, climbing", "Climbing to assigned altitude", "Cessna 123AB climbing to 5000", "Wilco, climbing"],
            originalCorrect: 2,
            image: "",
            explanation: "Always include aircraft identification when acknowledging assignments.",
            currentOptions: null,
            currentCorrect: null
        }
    ];
    
    allQuestions.forEach(q => {
        q.currentOptions = [...q.originalOptions];
        q.currentCorrect = q.originalCorrect;
    });
    
    updateQuestionCount();
    displayCategories();
    showMessage("Loaded sample questions. Upload questions.csv for your full database.", "info");
}

// ==================== CATEGORY MANAGEMENT ====================
function displayCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const categoryStats = {};
    allQuestions.forEach(q => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
    });
    
    Object.keys(CATEGORY_CONFIG).forEach(categoryName => {
        const config = CATEGORY_CONFIG[categoryName];
        const questionCount = categoryStats[categoryName] || 0;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">${questionCount} questions</div>
            <small class="text-muted">Click to start training</small>
        `;
        
        card.onclick = () => startCategory(categoryName);
        container.appendChild(card);
    });
    
    const categoryCountElem = document.getElementById('categoryCount');
    if (categoryCountElem) {
        categoryCountElem.textContent = Object.keys(CATEGORY_CONFIG).length;
    }
}

// ==================== SEARCH FUNCTIONALITY ====================
function performSearch(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        clearSearch();
        return;
    }
    
    const includeAnswers = document.getElementById('searchAnswersToggle')?.checked || false;
    const term = searchTerm.toLowerCase().trim();
    
    searchResults = allQuestions.filter(question => {
        // Search in question text
        if (question.text.toLowerCase().includes(term)) {
            return true;
        }
        
        // Search in answers if enabled
        if (includeAnswers) {
            for (let option of question.originalOptions) {
                if (option.toLowerCase().includes(term)) {
                    return true;
                }
            }
            
            // Also search in explanation
            if (question.explanation && question.explanation.toLowerCase().includes(term)) {
                return true;
            }
        }
        
        // Search in category
        if (question.category.toLowerCase().includes(term)) {
            return true;
        }
        
        return false;
    });
    
    if (searchResults.length > 0) {
        // If we're in quiz mode, go back to categories to show search results
        if (document.getElementById('quizSection').style.display === 'block') {
            backToCategories();
            // Wait a bit for the DOM to update
            setTimeout(() => {
                displaySearchResults(searchResults, term);
                showMessage(`Found ${searchResults.length} matching questions`, "success");
            }, 100);
        } else {
            displaySearchResults(searchResults, term);
            showMessage(`Found ${searchResults.length} matching questions`, "success");
        }
    } else {
        showMessage("No matching questions found", "info");
    }
}

function displaySearchResults(results, searchTerm) {
    isSearchActive = true;
    
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Group results by category
    const resultsByCategory = {};
    results.forEach(question => {
        if (!resultsByCategory[question.category]) {
            resultsByCategory[question.category] = [];
        }
        resultsByCategory[question.category].push(question);
    });
    
    // Display each category with matching questions
    Object.keys(resultsByCategory).forEach(categoryName => {
        const questionsInCategory = resultsByCategory[categoryName];
        const config = CATEGORY_CONFIG[categoryName] || {
            icon: "fa-question",
            color: "#6c757d"
        };
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">
                <span class="badge bg-primary">${questionsInCategory.length} matches</span>
            </div>
            <div class="question-preview">
                ${questionsInCategory.slice(0, 3).map(q => 
                    `<div class="mb-2">
                        <strong>•</strong> ${highlightText(q.text, searchTerm)}
                    </div>`
                ).join('')}
                ${questionsInCategory.length > 3 ? 
                    `<div class="text-muted">...and ${questionsInCategory.length - 3} more</div>` : ''}
            </div>
            <button onclick="startCategoryFromSearch('${categoryName}', ${JSON.stringify(questionsInCategory.map(q => q.id)).replace(/"/g, '&quot;')})" 
                    class="btn btn-sm btn-primary mt-2">
                <i class="fas fa-play"></i> Start with these
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Add a clear search button
    const clearCard = document.createElement('div');
    clearCard.className = 'category-card';
    clearCard.style.border = '2px dashed #6c757d';
    clearCard.innerHTML = `
        <div class="category-icon" style="background: #6c757d;">
            <i class="fas fa-times"></i>
        </div>
        <h5 class="fw-bold mb-2">Clear Search</h5>
        <div class="mb-2 text-muted">Return to all categories</div>
        <button onclick="clearSearch()" class="btn btn-sm btn-outline-secondary mt-2">
            <i class="fas fa-arrow-left"></i> Back to all
        </button>
    `;
    container.appendChild(clearCard);
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function startCategoryFromSearch(categoryName, questionIds) {
    // Filter questions to only include the searched ones
    categoryQuestions = allQuestions.filter(q => questionIds.includes(q.id));
    currentCategory = categoryName;
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    questionShuffledState.clear();
    
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = `${categoryName} (Search Results)`;
    
    shuffleQuestionsAndAnswers();
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting with ${categoryQuestions.length} filtered questions`, 'info');
}

function clearSearch() {
    isSearchActive = false;
    searchResults = [];
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Only display categories if we're in category view
    const categorySection = document.getElementById('categorySection');
    if (categorySection && categorySection.style.display !== 'none') {
        displayCategories();
    }
}

// ==================== QUIZ FUNCTIONS ====================
function startCategory(categoryName) {
    currentCategory = categoryName;
    categoryQuestions = allQuestions.filter(q => q.category === categoryName);
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    questionShuffledState.clear();
    
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = categoryName;
    
    shuffleQuestionsAndAnswers();
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting ${categoryName} training`, 'info');
}

function displayQuestion() {
    if (!categoryQuestions || categoryQuestions.length === 0) {
        document.getElementById('questionDisplay').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available for this category.
            </div>
        `;
        return;
    }
    
    const question = categoryQuestions[currentQuestionIndex];
    const container = document.getElementById('questionDisplay');
    
    let html = `
        <div class="question-box active-question">
            <h4 class="mb-3">${question.text}</h4>
    `;
    
    if (question.image && question.image.trim() !== '') {
        // Clean up the image path
        let imagePath = question.image.trim();
        
        // Extract image name without extension for display
        let imageName = extractImageName(imagePath);
        
        html += `
            <div class="chart-image">
                <img src="${imagePath}" alt="${imageName}" 
                     onerror="handleImageError(this, '${encodeURIComponent(imagePath)}')"
                     style="max-width: 100%; max-height: 300px; object-fit: contain;"
                     onclick="viewImage('${encodeURIComponent(imagePath)}', '${imageName.replace(/'/g, "\\'")}')">
                <div class="image-label">Click to enlarge</div>
                ${imageName ? `
                <div class="image-name">
                    <i class="fas fa-file-image me-1"></i> ${imageName}
                </div>` : ''}
            </div>
        `;
    }
    
    html += '<div class="mt-4">';
    question.currentOptions.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `
            <button class="answer-option" onclick="selectAnswer(${index})">
                <strong>${letter}.</strong> ${option}
            </button>
        `;
    });
    html += '</div></div>';
    
    container.innerHTML = html;
    
    document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
    document.getElementById('totalCounter').textContent = categoryQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === categoryQuestions.length - 1;
    const nextBtn = document.getElementById('nextButton');
    
    // Remove any emphasis from previous wrong answer
    nextBtn.classList.remove('next-emphasis');
    
    // Reset Next button to normal state
    nextBtn.disabled = false;
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    nextBtn.style.background = 'var(--primary-blue)';
    nextBtn.style.color = 'white';
    
    resetAnswerButtons();
}

function handleImageError(img, imageUrl) {
    console.log('Image failed to load:', imageUrl);
    const imageName = extractImageName(decodeURIComponent(imageUrl));
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found';
    img.style.border = '2px dashed #0056a6';
    img.alt = 'Image not available: ' + imageName;
    const label = img.parentElement.querySelector('.image-label');
    if (label) {
        label.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
    }
    
    // Update image name display even on error
    const imageNameElem = img.parentElement.querySelector('.image-name');
    if (imageNameElem && imageName) {
        imageNameElem.innerHTML = `<i class="fas fa-file-image me-1"></i> ${imageName}`;
    }
}

// ==================== IMAGE VIEWER ====================
function viewImage(imageUrl, imageName) {
    const modal = new bootstrap.Modal(document.getElementById('imageViewer'));
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // If imageName wasn't passed, extract it
    if (!imageName) {
        imageName = extractImageName(decodedUrl);
    }
    
    // Try to load the image
    const img = document.getElementById('enlargedImage');
    img.src = decodedUrl;
    img.alt = imageName;
    
    // Update image name in modal footer
    const imageNameText = document.getElementById('imageNameText');
    if (imageNameText) {
        imageNameText.textContent = imageName;
    }
    
    // Set up error handling for modal image too
    img.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/e0e7ff/0056a6?text=Image+Not+Available';
        this.alt = 'Image not available';
        if (imageNameText) {
            imageNameText.textContent = 'Image not available: ' + imageName;
        }
    };
    
    modal.show();
}

// ==================== ANSWER SELECTION WITH AUTO-ADVANCE ====================
function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    // Disable all answer buttons immediately
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark correct and incorrect answers
    buttons.forEach((btn, index) => {
        if (index === question.currentCorrect) {
            btn.classList.add('answer-correct');
        }
        if (index === selectedIndex && index !== question.currentCorrect) {
            btn.classList.add('answer-incorrect');
        }
    });
    
    // Update score
    userScore.attempted++;
    
    if (selectedIndex === question.currentCorrect) {
        userScore.correct++;
        
        // Visual feedback for correct answer
        const correctBtn = buttons[selectedIndex];
        correctBtn.classList.add('auto-advance');
        
        showMessage("Correct! ✓ Auto-advancing to next question...", "success");
        
        // AUTO-ADVANCE after 1.5 seconds for CORRECT answer
        setTimeout(() => {
            if (currentQuestionIndex < categoryQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion();
                updateProgress();
            } else {
                // Last question completed
                showMessage("Category completed! Review your statistics.", "success");
                updateStatistics();
                // Change Next button to "Finish" if it's the last question
                nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
            }
        }, 1500); // 1.5 second delay
        
    } else {
        // WRONG answer - highlight Next button and wait for click
        nextBtn.classList.add('next-emphasis');
        showMessage("Incorrect ✗ Click 'Next' to continue", "error");
        
        // Remove emphasis after 5 seconds if user doesn't click
        setTimeout(() => {
            nextBtn.classList.remove('next-emphasis');
        }, 5000);
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    buttons.forEach(btn => {
        btn.classList.remove('answer-correct', 'answer-incorrect', 'auto-advance');
        btn.disabled = false;
    });
    
    // Remove any emphasis from Next button
    nextBtn.classList.remove('next-emphasis');
}

function nextQuestion() {
    // Check if there are more questions
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        // This is the last question
        showMessage("Category completed! Review your statistics.", "success");
        
        // Make sure statistics are visible
        updateStatistics();
        
        // Update Next button to show "Finish" state
        const nextBtn = document.getElementById('nextButton');
        nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
        nextBtn.disabled = false;
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateProgress();
    }
}

function backToCategories() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('categorySection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    
    // If there's a search term, show search results instead of all categories
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== '') {
        performSearch(searchInput.value);
    } else {
        displayCategories();
    }
    
    showMessage("Returned to category selection", "info");
}

// ==================== SHUFFLING FUNCTIONS ====================
function shuffleQuestionsAndAnswers() {
    if (!categoryQuestions.length) return;
    
    shuffleArray(categoryQuestions);
    
    categoryQuestions.forEach((question) => {
        shuffleQuestionAnswers(question);
    });
}

function shuffleQuestionAnswers(question) {
    if (!question) return;
    
    const correctAnswerText = question.originalOptions[question.originalCorrect];
    const shuffledOptions = [...question.originalOptions];
    shuffleArray(shuffledOptions);
    
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
    
    question.currentOptions = shuffledOptions;
    question.currentCorrect = newCorrectIndex;
    
    questionShuffledState.set(question.id, {
        options: [...shuffledOptions],
        correct: newCorrectIndex
    });
    
    return question;
}

function randomizeQuestions() {
    if (!categoryQuestions.length) return;
    
    shuffleQuestionsAndAnswers();
    currentQuestionIndex = 0;
    displayQuestion();
    showMessage("Questions and answers shuffled!", "info");
}

function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    shuffleQuestionAnswers(question);
    displayQuestion();
    showMessage("Answers shuffled for this question", "info");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==================== UI UPDATES ====================
function updateProgress() {
    if (!categoryQuestions.length) return;
    
    const progress = ((currentQuestionIndex + 1) / categoryQuestions.length) * 100;
    document.getElementById('progressIndicator').style.width = `${progress}%`;
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = 
        `${userScore.correct}/${userScore.attempted}`;
}

function updateStatistics() {
    document.getElementById('correctAnswers').textContent = userScore.correct;
    document.getElementById('incorrectAnswers').textContent = userScore.attempted - userScore.correct;
    document.getElementById('totalAnswered').textContent = userScore.attempted;
    
    const accuracy = userScore.attempted > 0 
        ? Math.round((userScore.correct / userScore.attempted) * 100) 
        : 0;
    document.getElementById('accuracyRate').textContent = `${accuracy}%`;
    
    if (userScore.attempted > 0) {
        document.getElementById('statsSection').style.display = 'block';
    }
}

function updateQuestionCount() {
    document.getElementById('questionCount').textContent = allQuestions.length;
}

// ==================== UTILITY FUNCTIONS ====================
function refreshApp() {
    if (confirm("Refresh the application? This will reset your current progress.")) {
        location.reload();
    }
}

function showMessage(text, type = 'info') {
    const existing = document.querySelector('.system-message');
    if (existing) existing.remove();
    
    const message = document.createElement('div');
    message.className = 'system-message';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : 
                     type === 'error' ? '#dc3545' : 
                     '#0056a6'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s;
        max-width: 300px;
    `;
    
    const icon = type === 'success' ? 'fa-check' : 
                 type === 'error' ? 'fa-times' : 'fa-info';
    message.innerHTML = `<i class="fas ${icon} me-2"></i>${text}`;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
if (!document.querySelector('#animations')) {
    const style = document.createElement('style');
    style.id = 'animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}            showMessage("System ready. Select a category to begin.", "success");
        } else {
            console.log("CSV file not found, loading sample data");
            loadSampleData();
        }
    } catch (error) {
        console.error("Error loading questions:", error);
        loadSampleData();
    }
}

function processCSV(csvText) {
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row || row === '') continue;
        
        try {
            const columns = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of row) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    columns.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            columns.push(current);
            
            if (columns.length >= 7) {
                let correctIndex = parseInt(columns[6].trim()) - 1;
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                    correctIndex = 0;
                }
                
                let imagePath = '';
                if (columns.length > 7 && columns[7]) {
                    imagePath = columns[7].trim();
                    if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('./')) {
                        imagePath = './' + imagePath;
                    }
                }
                
                let explanation = '';
                if (columns.length > 8 && columns[8]) {
                    explanation = columns[8].trim();
                }
                
                const question = {
                    id: `q${i}`,
                    category: columns[0].trim(),
                    text: columns[1].trim(),
                    originalOptions: [
                        columns[2].trim(),
                        columns[3].trim(),
                        columns[4].trim(),
                        columns[5].trim()
                    ],
                    originalCorrect: correctIndex,
                    image: imagePath,
                    explanation: explanation,
                    currentOptions: null,
                    currentCorrect: null
                };
                
                question.currentOptions = [...question.originalOptions];
                question.currentCorrect = question.originalCorrect;
                
                if (question.text && question.originalOptions[0]) {
                    questions.push(question);
                }
            }
        } catch (e) {
            console.warn(`Error parsing line ${i}:`, e);
        }
    }
    
    return questions;
}

function loadSampleData() {
    console.log("Loading sample aviation questions...");
    
    allQuestions = [
        {
            id: "q1",
            category: "Flight Plan",
            text: "What does this flight planning chart show?",
            originalOptions: ["Standard instrument departure", "Enroute navigation chart", "Standard terminal arrival", "Weather minimums chart"],
            originalCorrect: 0,
            image: "./images/Flight Plan/site-1.jpg",
            explanation: "This is a Standard Instrument Departure (SID) chart.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q2",
            category: "Flight Plan",
            text: "What is the minimum fuel required for an IFR flight?",
            originalOptions: ["Fuel to destination only", "Fuel to destination plus 30 minutes", "Fuel to alternate plus 30 minutes", "Fuel to destination plus alternate plus 45 minutes"],
            originalCorrect: 3,
            image: "",
            explanation: "FAR 91.167 requires fuel to destination, then to alternate, plus 45 minutes reserve.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q3",
            category: "IFR Comms",
            text: "What phrase should be used to acknowledge an altitude assignment?",
            originalOptions: ["Roger, climbing", "Climbing to assigned altitude", "Cessna 123AB climbing to 5000", "Wilco, climbing"],
            originalCorrect: 2,
            image: "",
            explanation: "Always include aircraft identification when acknowledging assignments.",
            currentOptions: null,
            currentCorrect: null
        }
    ];
    
    allQuestions.forEach(q => {
        q.currentOptions = [...q.originalOptions];
        q.currentCorrect = q.originalCorrect;
    });
    
    updateQuestionCount();
    displayCategories();
    showMessage("Loaded sample questions. Upload questions.csv for your full database.", "info");
}

// ==================== CATEGORY MANAGEMENT ====================
function displayCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return; // Container might not exist if we're in quiz mode
    
    container.innerHTML = '';
    
    const categoryStats = {};
    allQuestions.forEach(q => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
    });
    
    Object.keys(CATEGORY_CONFIG).forEach(categoryName => {
        const config = CATEGORY_CONFIG[categoryName];
        const questionCount = categoryStats[categoryName] || 0;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">${questionCount} questions</div>
            <small class="text-muted">Click to start training</small>
        `;
        
        card.onclick = () => startCategory(categoryName);
        container.appendChild(card);
    });
    
    const categoryCountElem = document.getElementById('categoryCount');
    if (categoryCountElem) {
        categoryCountElem.textContent = Object.keys(CATEGORY_CONFIG).length;
    }
}

// ==================== SEARCH FUNCTIONALITY ====================
function performSearch(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        clearSearch();
        return;
    }
    
    const includeAnswers = document.getElementById('searchAnswersToggle')?.checked || false;
    const term = searchTerm.toLowerCase().trim();
    
    searchResults = allQuestions.filter(question => {
        // Search in question text
        if (question.text.toLowerCase().includes(term)) {
            return true;
        }
        
        // Search in answers if enabled
        if (includeAnswers) {
            for (let option of question.originalOptions) {
                if (option.toLowerCase().includes(term)) {
                    return true;
                }
            }
            
            // Also search in explanation
            if (question.explanation && question.explanation.toLowerCase().includes(term)) {
                return true;
            }
        }
        
        // Search in category
        if (question.category.toLowerCase().includes(term)) {
            return true;
        }
        
        return false;
    });
    
    if (searchResults.length > 0) {
        // If we're in quiz mode, go back to categories to show search results
        if (document.getElementById('quizSection').style.display === 'block') {
            backToCategories();
            // Wait a bit for the DOM to update
            setTimeout(() => {
                displaySearchResults(searchResults, term);
                showMessage(`Found ${searchResults.length} matching questions`, "success");
            }, 100);
        } else {
            displaySearchResults(searchResults, term);
            showMessage(`Found ${searchResults.length} matching questions`, "success");
        }
    } else {
        showMessage("No matching questions found", "info");
        // DON'T clear the search input - keep what user typed
    }
}

function displaySearchResults(results, searchTerm) {
    isSearchActive = true;
    
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Group results by category
    const resultsByCategory = {};
    results.forEach(question => {
        if (!resultsByCategory[question.category]) {
            resultsByCategory[question.category] = [];
        }
        resultsByCategory[question.category].push(question);
    });
    
    // Display each category with matching questions
    Object.keys(resultsByCategory).forEach(categoryName => {
        const questionsInCategory = resultsByCategory[categoryName];
        const config = CATEGORY_CONFIG[categoryName] || {
            icon: "fa-question",
            color: "#6c757d"
        };
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">
                <span class="badge bg-primary">${questionsInCategory.length} matches</span>
            </div>
            <div class="question-preview">
                ${questionsInCategory.slice(0, 3).map(q => 
                    `<div class="mb-2">
                        <strong>•</strong> ${highlightText(q.text, searchTerm)}
                    </div>`
                ).join('')}
                ${questionsInCategory.length > 3 ? 
                    `<div class="text-muted">...and ${questionsInCategory.length - 3} more</div>` : ''}
            </div>
            <button onclick="startCategoryFromSearch('${categoryName}', ${JSON.stringify(questionsInCategory.map(q => q.id)).replace(/"/g, '&quot;')})" 
                    class="btn btn-sm btn-primary mt-2">
                <i class="fas fa-play"></i> Start with these
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Add a clear search button
    const clearCard = document.createElement('div');
    clearCard.className = 'category-card';
    clearCard.style.border = '2px dashed #6c757d';
    clearCard.innerHTML = `
        <div class="category-icon" style="background: #6c757d;">
            <i class="fas fa-times"></i>
        </div>
        <h5 class="fw-bold mb-2">Clear Search</h5>
        <div class="mb-2 text-muted">Return to all categories</div>
        <button onclick="clearSearch()" class="btn btn-sm btn-outline-secondary mt-2">
            <i class="fas fa-arrow-left"></i> Back to all
        </button>
    `;
    container.appendChild(clearCard);
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function startCategoryFromSearch(categoryName, questionIds) {
    // Filter questions to only include the searched ones
    categoryQuestions = allQuestions.filter(q => questionIds.includes(q.id));
    currentCategory = categoryName;
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    questionShuffledState.clear();
    
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = `${categoryName} (Search Results)`;
    
    shuffleQuestionsAndAnswers();
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting with ${categoryQuestions.length} filtered questions`, 'info');
}

function clearSearch() {
    isSearchActive = false;
    searchResults = [];
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Only display categories if we're in category view
    const categorySection = document.getElementById('categorySection');
    if (categorySection && categorySection.style.display !== 'none') {
        displayCategories();
    }
}

// ==================== QUIZ FUNCTIONS ====================
function startCategory(categoryName) {
    currentCategory = categoryName;
    categoryQuestions = allQuestions.filter(q => q.category === categoryName);
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    questionShuffledState.clear();
    
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = categoryName;
    
    shuffleQuestionsAndAnswers();
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting ${categoryName} training`, 'info');
}

function shuffleQuestionsAndAnswers() {
    if (!categoryQuestions.length) return;
    
    shuffleArray(categoryQuestions);
    
    categoryQuestions.forEach((question) => {
        shuffleQuestionAnswers(question);
    });
}

function shuffleQuestionAnswers(question) {
    if (!question) return;
    
    const correctAnswerText = question.originalOptions[question.originalCorrect];
    const shuffledOptions = [...question.originalOptions];
    shuffleArray(shuffledOptions);
    
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
    
    question.currentOptions = shuffledOptions;
    question.currentCorrect = newCorrectIndex;
    
    questionShuffledState.set(question.id, {
        options: [...shuffledOptions],
        correct: newCorrectIndex
    });
    
    return question;
}

function displayQuestion() {
    if (!categoryQuestions || categoryQuestions.length === 0) {
        document.getElementById('questionDisplay').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available for this category.
            </div>
        `;
        return;
    }
    
    const question = categoryQuestions[currentQuestionIndex];
    const container = document.getElementById('questionDisplay');
    
    let html = `
        <div class="question-box active-question">
            <h4 class="mb-3">${question.text}</h4>
    `;
    
    if (question.image && question.image.trim() !== '') {
        // Clean up the image path
        let imagePath = question.image.trim();
        
        html += `
            <div class="chart-image" onclick="viewImage('${encodeURIComponent(imagePath)}')">
                <img src="${imagePath}" alt="Aviation chart" 
                     onerror="handleImageError(this, '${encodeURIComponent(imagePath)}')"
                     style="max-width: 100%; max-height: 300px; object-fit: contain;">
                <div class="image-label">Click to enlarge</div>
            </div>
        `;
    }
    
    html += '<div class="mt-4">';
    question.currentOptions.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `
            <button class="answer-option" onclick="selectAnswer(${index})">
                <strong>${letter}.</strong> ${option}
            </button>
        `;
    });
    html += '</div></div>';
    
    container.innerHTML = html;
    
    document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
    document.getElementById('totalCounter').textContent = categoryQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === categoryQuestions.length - 1;
    const nextBtn = document.getElementById('nextButton');
    
    // Remove any emphasis from previous wrong answer
    nextBtn.classList.remove('next-emphasis');
    
    // Reset Next button to normal state
    nextBtn.disabled = false;
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    nextBtn.style.background = 'var(--primary-blue)';
    nextBtn.style.color = 'white';
    
    resetAnswerButtons();
}

function handleImageError(img, imageUrl) {
    console.log('Image failed to load:', imageUrl);
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found';
    img.style.border = '2px dashed #0056a6';
    img.alt = 'Image not available';
    const label = img.parentElement.querySelector('.image-label');
    if (label) {
        label.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
    }
}

// ==================== ANSWER SELECTION WITH AUTO-ADVANCE ====================
function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    // Disable all answer buttons immediately
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark correct and incorrect answers
    buttons.forEach((btn, index) => {
        if (index === question.currentCorrect) {
            btn.classList.add('answer-correct');
        }
        if (index === selectedIndex && index !== question.currentCorrect) {
            btn.classList.add('answer-incorrect');
        }
    });
    
    // Update score
    userScore.attempted++;
    
    if (selectedIndex === question.currentCorrect) {
        userScore.correct++;
        
        // Visual feedback for correct answer
        const correctBtn = buttons[selectedIndex];
        correctBtn.classList.add('auto-advance');
        
        showMessage("Correct! ✓ Auto-advancing to next question...", "success");
        
        // AUTO-ADVANCE after 1.5 seconds for CORRECT answer
        setTimeout(() => {
            if (currentQuestionIndex < categoryQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion();
                updateProgress();
            } else {
                // Last question completed
                showMessage("Category completed! Review your statistics.", "success");
                updateStatistics();
                // Change Next button to "Finish" if it's the last question
                nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
            }
        }, 1500); // 1.5 second delay
        
    } else {
        // WRONG answer - highlight Next button and wait for click
        nextBtn.classList.add('next-emphasis');
        showMessage("Incorrect ✗ Click 'Next' to continue", "error");
        
        // Remove emphasis after 5 seconds if user doesn't click
        setTimeout(() => {
            nextBtn.classList.remove('next-emphasis');
        }, 5000);
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    buttons.forEach(btn => {
        btn.classList.remove('answer-correct', 'answer-incorrect', 'auto-advance');
        btn.disabled = false;
    });
    
    // Remove any emphasis from Next button
    nextBtn.classList.remove('next-emphasis');
}

function nextQuestion() {
    // Check if there are more questions
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        // This is the last question
        showMessage("Category completed! Review your statistics.", "success");
        
        // Make sure statistics are visible
        updateStatistics();
        
        // Update Next button to show "Finish" state
        const nextBtn = document.getElementById('nextButton');
        nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
        nextBtn.disabled = false;
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateProgress();
    }
}

function backToCategories() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('categorySection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    
    // If there's a search term, show search results instead of all categories
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== '') {
        performSearch(searchInput.value);
    } else {
        displayCategories();
    }
    
    showMessage("Returned to category selection", "info");
}

// ==================== SHUFFLING FUNCTIONS ====================
function randomizeQuestions() {
    if (!categoryQuestions.length) return;
    
    shuffleQuestionsAndAnswers();
    currentQuestionIndex = 0;
    displayQuestion();
    showMessage("Questions and answers shuffled!", "info");
}

function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    shuffleQuestionAnswers(question);
    displayQuestion();
    showMessage("Answers shuffled for this question", "info");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==================== IMAGE FUNCTIONS ====================
function viewImage(imageUrl) {
    const modal = new bootstrap.Modal(document.getElementById('imageViewer'));
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Try to load the image
    const img = document.getElementById('enlargedImage');
    img.src = decodedUrl;
    
    // Set up error handling for modal image too
    img.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/e0e7ff/0056a6?text=Image+Not+Available';
    };
    
    modal.show();
}

// ==================== UI UPDATES ====================
function updateProgress() {
    if (!categoryQuestions.length) return;
    
    const progress = ((currentQuestionIndex + 1) / categoryQuestions.length) * 100;
    document.getElementById('progressIndicator').style.width = `${progress}%`;
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = 
        `${userScore.correct}/${userScore.attempted}`;
}

function updateStatistics() {
    document.getElementById('correctAnswers').textContent = userScore.correct;
    document.getElementById('incorrectAnswers').textContent = userScore.attempted - userScore.correct;
    document.getElementById('totalAnswered').textContent = userScore.attempted;
    
    const accuracy = userScore.attempted > 0 
        ? Math.round((userScore.correct / userScore.attempted) * 100) 
        : 0;
    document.getElementById('accuracyRate').textContent = `${accuracy}%`;
    
    if (userScore.attempted > 0) {
        document.getElementById('statsSection').style.display = 'block';
    }
}

function updateQuestionCount() {
    document.getElementById('questionCount').textContent = allQuestions.length;
}

// ==================== UTILITY FUNCTIONS ====================
function refreshApp() {
    if (confirm("Refresh the application? This will reset your current progress.")) {
        location.reload();
    }
}

function showMessage(text, type = 'info') {
    const existing = document.querySelector('.system-message');
    if (existing) existing.remove();
    
    const message = document.createElement('div');
    message.className = 'system-message';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : 
                     type === 'error' ? '#dc3545' : 
                     '#0056a6'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s;
        max-width: 300px;
    `;
    
    const icon = type === 'success' ? 'fa-check' : 
                 type === 'error' ? 'fa-times' : 'fa-info';
    message.innerHTML = `<i class="fas ${icon} me-2"></i>${text}`;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
if (!document.querySelector('#animations')) {
    const style = document.createElement('style');
    style.id = 'animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
