// ==================== CATEGORY CONFIGURATION ====================
const CATEGORY_CONFIG = {
    "Flight Plan": {
        icon: "fa-route",
        color: "#0056a6",
        filename: "categories/flight_plan.csv"
    },
    "IFR Comms": {
        icon: "fa-headset",
        color: "#28a745",
        filename: "categories/ifr_comms.csv"
    },
    "Mass And Balance": {
        icon: "fa-weight-scale",
        color: "#dc3545",
        filename: "categories/mass_and_balance.csv"
    },
    "OPS": {
        icon: "fa-clipboard-check",
        color: "#6f42c1",
        filename: "categories/ops.csv"
    },
    "Performance": {
        icon: "fa-chart-line",
        color: "#fd7e14",
        filename: "categories/performance.csv"
    },
    "RNAV": {
        icon: "fa-satellite-dish",
        color: "#17a2b8",
        filename: "categories/rnav.csv"
    },
    "VFR Comms": {
        icon: "fa-tower-broadcast",
        color: "#20c997",
        filename: "categories/vfr_comms.csv"
    }
};

// Application State
let currentCategory = "";
let categoryQuestions = [];
let currentQuestionIndex = 0;
let userScore = { correct: 0, attempted: 0 };
let questionShuffledState = new Map();
let categoryQuestionCounts = {};
let totalQuestionsCount = 0;
let currentRotation = 0;
let currentZoom = 1;
let showAnswersMode = false;

// For search - we'll load on demand
let searchQuestions = null;

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
    const showAnswersToggle = document.getElementById('showAnswerMode');
    if (showAnswersToggle) {
    showAnswersToggle.addEventListener('change', function() {
        showAnswersMode = this.checked;
        displayQuestion();
    });
    }
    // Add search toggle listener
    const searchToggle = document.getElementById('searchAnswersToggle');
    if (searchToggle) {
        searchToggle.addEventListener('change', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim() !== '') {
                performSearch(searchInput.value);
            }
        });
    }
});

// ==================== SYSTEM INITIALIZATION ====================
async function initializeSystem() {
    console.log("Loading system configuration...");
    
    // Load question counts for each category
    await loadCategoryCounts();
    
    displayCategories();
    showMessage("System ready. Select a category to begin.", "success");
}

// Load question counts for each category
async function loadCategoryCounts() {
    console.log("Loading category question counts...");
    categoryQuestionCounts = {};
    totalQuestionsCount = 0;
    
    // Load each category file to count questions
    for (const [categoryName, config] of Object.entries(CATEGORY_CONFIG)) {
        try {
            const response = await fetch(config.filename);
            if (response.ok) {
                const csvData = await response.text();
                const questions = processCSV(csvData, categoryName);
                categoryQuestionCounts[categoryName] = questions.length;
                totalQuestionsCount += questions.length;
                console.log(`✓ ${categoryName}: ${questions.length} questions`);
            } else {
                categoryQuestionCounts[categoryName] = 0;
                console.warn(`✗ Could not load ${config.filename}`);
            }
        } catch (error) {
            categoryQuestionCounts[categoryName] = 0;
            console.warn(`✗ Error loading ${config.filename}:`, error);
        }
    }
    
    // Update total count display
    document.getElementById('totalQuestionsCount').textContent = totalQuestionsCount;
    document.getElementById('categoryCount').textContent = Object.keys(CATEGORY_CONFIG).length;
    console.log(`Total questions: ${totalQuestionsCount}`);
}

// ==================== CSV PROCESSING ====================
function processCSV(csvText, categoryName) {
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row || row === '') continue;
        
        // Handle CSV with potential commas in content
        const columns = parseCSVRow(row);
        
        if (columns.length >= 7) {
            // FIXED: Correct answer index mapping
            // CSV: 1 = A, 2 = B, 3 = C, 4 = D
            // Array: 0 = A, 1 = B, 2 = C, 3 = D
            let correctIndex = parseInt(columns[6].trim()) - 1;
            
            // Validate the index is within range (0-3)
            if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                console.warn(`Invalid correct answer index in row ${i}: ${columns[6]}, defaulting to A`);
                correctIndex = 0;
            }
            
            // Handle multiple images (pipe-separated)
            let images = [];
            if (columns.length > 7 && columns[7]) {
                const imageField = columns[7].trim();
                // Split by pipe character to get multiple image paths
                const imagePaths = imageField.split('|').map(path => path.trim());
                
                imagePaths.forEach(imagePath => {
                    if (imagePath) {
                        if (!imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('./')) {
                            imagePath = './' + imagePath;
                        }
                        images.push(imagePath);
                    }
                });
            }
            
            let explanation = '';
            if (columns.length > 8 && columns[8]) {
                explanation = columns[8].trim();
            }
            
            // Generate a stable ID based on content
            const questionId = `q_${categoryName.replace(/\s+/g, '_')}_${i}_${hashCode(columns[1])}`;
            
            const question = {
                id: questionId,
                category: categoryName,
                text: columns[1].trim(),
                originalOptions: [
                    columns[2].trim(),
                    columns[3].trim(),
                    columns[4].trim(),
                    columns[5].trim()
                ],
                originalCorrect: correctIndex,
                images: images,
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
    }
    
    return questions;
}

// Helper function to parse CSV rows with quoted content
function parseCSVRow(row) {
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            columns.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last column
    columns.push(current);
    
    return columns;
}

// Helper function to create hash from string
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
}

// ==================== SEARCH FUNCTIONALITY ====================
async function performSearch(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        clearSearch();
        return;
    }
    
    // Show loading for search
    showMessage("Searching...", "info");
    
    // Load all questions for search if not already loaded
    if (!searchQuestions) {
        searchQuestions = await loadAllQuestionsForSearch();
    }
    
    const includeAnswers = document.getElementById('searchAnswersToggle')?.checked || false;
    const term = searchTerm.toLowerCase().trim();
    
    const searchResults = searchQuestions.filter(question => {
        // Search in question text
        if (question.text.toLowerCase().includes(term)) {
            return true;
        }
        
        // Search in category
        if (question.category.toLowerCase().includes(term)) {
            return true;
        }
        
        // Search in answers if enabled
        if (includeAnswers) {
            // Search in options
            for (let option of question.originalOptions) {
                if (option.toLowerCase().includes(term)) {
                    return true;
                }
            }
            
            // Search in explanation
            if (question.explanation && question.explanation.toLowerCase().includes(term)) {
                return true;
            }
        }
        
        return false;
    });
    
    if (searchResults.length > 0) {
        displaySearchResults(searchResults, term);
        showMessage(`Found ${searchResults.length} matching questions`, "success");
    } else {
        showMessage("No matching questions found", "info");
        // Return to normal categories view
        displayCategories();
    }
}

async function loadAllQuestionsForSearch() {
    console.log("Loading all questions for search...");
    const allQuestions = [];
    
    for (const [categoryName, config] of Object.entries(CATEGORY_CONFIG)) {
        try {
            const response = await fetch(config.filename);
            if (response.ok) {
                const csvData = await response.text();
                const questions = processCSV(csvData, categoryName);
                allQuestions.push(...questions);
                console.log(`✓ Loaded ${questions.length} ${categoryName} questions for search`);
            }
        } catch (error) {
            console.warn(`✗ Error loading ${categoryName} for search:`, error);
        }
    }
    
    console.log(`Total questions loaded for search: ${allQuestions.length}`);
    return allQuestions;
}

function displaySearchResults(results, searchTerm) {
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

async function startCategoryFromSearch(categoryName, questionIds) {
    // Show loading
    showLoading(true);
    
    try {
        // Load the category CSV
        const config = CATEGORY_CONFIG[categoryName];
        const response = await fetch(config.filename);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${categoryName} questions`);
        }
        
        const csvData = await response.text();
        const allCategoryQuestions = processCSV(csvData, categoryName);
        
        // Filter to only the searched questions
        categoryQuestions = allCategoryQuestions.filter(q => questionIds.includes(q.id));
        
        if (categoryQuestions.length === 0) {
            // Fallback: start normal category if IDs don't match
            categoryQuestions = allCategoryQuestions;
            showMessage("Starting full category", "info");
        }
        
        // Initialize quiz state
        currentCategory = categoryName;
        currentQuestionIndex = 0;
        userScore = { correct: 0, attempted: 0 };
        questionShuffledState.clear();
        
        // Update UI
        document.getElementById('categorySection').style.display = 'none';
        document.getElementById('quizSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('categoryNameDisplay').textContent = `${categoryName} (Search Results)`;
        
        // Reset questions to original order and answers
        resetQuestionsToOriginal();
        
        displayQuestion();
        updateProgress();
        updateScoreDisplay();
        
        showMessage(`Starting with ${categoryQuestions.length} filtered questions`, 'info');
        
    } catch (error) {
        console.error("Error loading category from search:", error);
        showMessage(`Error: ${error.message}`, "error");
    } finally {
        showLoading(false);
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    displayCategories();
    showMessage("Search cleared", "info");
}

// ==================== CATEGORY MANAGEMENT ====================
function displayCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(CATEGORY_CONFIG).forEach(categoryName => {
        const config = CATEGORY_CONFIG[categoryName];
        const questionCount = categoryQuestionCounts[categoryName] || 0;
        
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
}

// ==================== LOAD CATEGORY QUESTIONS ====================
async function startCategory(categoryName) {
    if (!categoryName || !CATEGORY_CONFIG[categoryName]) {
        showMessage("Invalid category selected", "error");
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        const config = CATEGORY_CONFIG[categoryName];
        
        // Load category-specific CSV file
        const response = await fetch(config.filename);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${categoryName} questions`);
        }
        
        const csvData = await response.text();
        categoryQuestions = processCSV(csvData, categoryName);
        
        if (categoryQuestions.length === 0) {
            showMessage("No questions found in this category", "error");
            showLoading(false);
            return;
        }
        
        // Initialize quiz state
        currentCategory = categoryName;
        currentQuestionIndex = 0;
        userScore = { correct: 0, attempted: 0 };
        questionShuffledState.clear();
        
        // Update UI
        document.getElementById('categorySection').style.display = 'none';
        document.getElementById('quizSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('categoryNameDisplay').textContent = categoryName;
        
        // Reset questions to original order and answers (NO SHUFFLING)
        resetQuestionsToOriginal();
        
        displayQuestion();
        updateProgress();
        updateScoreDisplay();
        
        showMessage(`Loaded ${categoryQuestions.length} ${categoryName} questions`, 'success');
        
    } catch (error) {
        console.error("Error loading category:", error);
        showMessage(`Error loading ${categoryName} questions: ${error.message}`, "error");
    } finally {
        showLoading(false);
    }
}

// Reset all questions to their original state
function resetQuestionsToOriginal() {
    if (!categoryQuestions.length) return;
    
    categoryQuestions.forEach((question) => {
        // Reset to original options and correct answer
        question.currentOptions = [...question.originalOptions];
        question.currentCorrect = question.originalCorrect;
        
        // Clear any shuffled state
        questionShuffledState.delete(question.id);
        
        // Clear answered status
        delete question.answered;
    });
}

// ==================== LOADING STATE ====================
function showLoading(isLoading) {
    const loadingSection = document.getElementById('loadingSection');
    const categorySection = document.getElementById('categorySection');
    const quizSection = document.getElementById('quizSection');
    
    if (isLoading) {
        loadingSection.style.display = 'block';
        categorySection.style.display = 'none';
        quizSection.style.display = 'none';
    } else {
        loadingSection.style.display = 'none';
    }
}

// ==================== IMAGE HANDLING ====================
function extractImageName(imagePath) {
    if (!imagePath) return '';
    const fileName = imagePath.split('/').pop();
    return fileName.replace(/\.[^/.]+$/, "");
}

function handleImageError(img, imageUrl) {
    const imageName = extractImageName(decodeURIComponent(imageUrl));
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found';
    img.style.border = '2px dashed #0056a6';
    img.alt = 'Image not available: ' + imageName;
    
    const label = img.parentElement.querySelector('.image-label');
    if (label) {
        label.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
    }
    
    const imageNameElem = img.parentElement.querySelector('.image-name');
    if (imageNameElem && imageName) {
        imageNameElem.innerHTML = `<i class="fas fa-file-image me-1"></i> ${imageName}`;
    }
}

// ==================== FIXED: SMOOTH ZOOM WITH NO JUMPING ====================
function viewImage(imageUrl) {
    const modal = new bootstrap.Modal(document.getElementById('imageViewer'));
    const decodedUrl = decodeURIComponent(imageUrl);
    const imageName = extractImageName(decodedUrl);
    
    let currentZoom = 1;
    
    const img = document.getElementById('enlargedImage');
    const container = document.querySelector('#imageViewer .modal-body div');
    
    // Store original image dimensions
    let naturalWidth = 0;
    let naturalHeight = 0;
    
    // Setup image - start in center mode
    img.src = decodedUrl;
    img.alt = imageName;
    img.style.transform = `scale(${currentZoom})`;
    img.style.transformOrigin = 'center center';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '70vh';
    img.style.cursor = 'default';
    img.style.display = 'block';
    img.style.margin = 'auto';
    
    // Reset container - start in center mode
    container.scrollLeft = 0;
    container.scrollTop = 0;
    container.style.overflow = 'auto';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.padding = '0';
    
    const imageNameText = document.getElementById('imageNameText');
    if (imageNameText) {
        imageNameText.textContent = imageName;
    }
    
    // Remove existing controls
    const existingControls = document.querySelector('.image-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // Add controls
    const modalFooter = document.querySelector('#imageViewer .modal-footer');
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'image-controls me-auto';
    controlsDiv.innerHTML = `
        <div class="btn-group btn-group-sm me-2">
            <button class="btn btn-outline-primary" id="zoomInBtn" title="Zoom In (Ctrl++)">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="btn btn-outline-primary" id="zoomOutBtn" title="Zoom Out (Ctrl+-)">
                <i class="fas fa-search-minus"></i>
            </button>
        </div>
        <button class="btn btn-outline-secondary btn-sm" id="resetBtn" title="Reset (Ctrl+0)">
            <i class="fas fa-sync-alt"></i> Reset
        </button>
    `;
    
    modalFooter.insertBefore(controlsDiv, modalFooter.firstChild);
    
    // Function to update image position in pan mode
    function updatePanPosition() {
        if (!naturalWidth || !naturalHeight || currentZoom <= 1.05) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const displayWidth = naturalWidth * currentZoom;
        const displayHeight = naturalHeight * currentZoom;
        
        // Calculate scroll position to keep image centered
        const targetScrollLeft = Math.max(0, (displayWidth - containerWidth) / 2);
        const targetScrollTop = Math.max(0, (displayHeight - containerHeight) / 2);
        
        container.scrollLeft = targetScrollLeft;
        container.scrollTop = targetScrollTop;
    }
    
    // Zoom function with smooth transition
    function zoom(factor) {
        // Store the previous zoom level
        const previousZoom = currentZoom;
        
        // Calculate new zoom
        currentZoom = currentZoom * factor;
        if (currentZoom < 0.5) currentZoom = 0.5;
        if (currentZoom > 5) currentZoom = 5;
        
        // Apply the transform
        img.style.transform = `scale(${currentZoom})`;
        
        // Check if we crossed the threshold
        const wasInPanMode = previousZoom > 1.05;
        const nowInPanMode = currentZoom > 1.05;
        
        if (!wasInPanMode && nowInPanMode) {
            // Just entered pan mode - switch container to block
            container.style.display = 'block';
            container.style.alignItems = 'normal';
            container.style.justifyContent = 'normal';
            img.style.margin = '0';
            img.style.transformOrigin = '0 0';
            
            // Position the image to maintain center
            setTimeout(updatePanPosition, 10);
        } 
        else if (wasInPanMode && !nowInPanMode) {
            // Just exited pan mode - switch back to center mode
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            img.style.margin = 'auto';
            img.style.transformOrigin = 'center center';
            container.scrollLeft = 0;
            container.scrollTop = 0;
        }
        else if (nowInPanMode) {
            // Already in pan mode - just update position to maintain center
            updatePanPosition();
        }
        
        // Update cursor
        img.style.cursor = currentZoom > 1.05 ? 'grab' : 'default';
    }
    
    // Reset function
    function reset() {
        currentZoom = 1;
        img.style.transform = 'scale(1)';
        
        // Return to center mode
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        img.style.margin = 'auto';
        img.style.transformOrigin = 'center center';
        container.scrollLeft = 0;
        container.scrollTop = 0;
        img.style.cursor = 'default';
    }
    
    // Add event listeners
    document.getElementById('zoomInBtn').addEventListener('click', () => zoom(1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(0.8));
    document.getElementById('resetBtn').addEventListener('click', reset);
    
    // Drag to pan
    let isDragging = false;
    let startX, startY;
    let scrollLeft, scrollTop;
    
    img.addEventListener('mousedown', (e) => {
        if (currentZoom > 1.05) {
            isDragging = true;
            img.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
            e.preventDefault();
        }
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        container.scrollLeft = scrollLeft - (x - startX);
        container.scrollTop = scrollTop - (y - startY);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            img.style.cursor = currentZoom > 1.05 ? 'grab' : 'default';
        }
    });
    
    container.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            img.style.cursor = currentZoom > 1.05 ? 'grab' : 'default';
        }
    });
    
    // Keyboard shortcuts
    const keyHandler = (e) => {
        if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoom(1.2);
        } else if (e.ctrlKey && e.key === '-') {
            e.preventDefault();
            zoom(0.8);
        } else if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            reset();
        } else if (!e.ctrlKey && currentZoom > 1.05) {
            const panAmount = 50;
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                container.scrollTop -= panAmount;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                container.scrollTop += panAmount;
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                container.scrollLeft -= panAmount;
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                container.scrollLeft += panAmount;
            }
        }
    };
    
    document.addEventListener('keydown', keyHandler);
    
    // When image loads, get dimensions
    img.onload = function() {
        naturalWidth = img.naturalWidth;
        naturalHeight = img.naturalHeight;
    };
    
    img.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/e0e7ff/0056a6?text=Image+Not+Available';
        this.alt = 'Image not available';
        if (imageNameText) {
            imageNameText.textContent = imageName;
        }
    };
    
    modal.show();
    
    // Clean up
    document.getElementById('imageViewer').addEventListener('hidden.bs.modal', function() {
        document.removeEventListener('keydown', keyHandler);
        const controls = document.querySelector('.image-controls');
        if (controls) {
            controls.remove();
        }
    }, { once: true });
}

function rotateImage(degrees) {
    currentRotation = (currentRotation + degrees) % 360;
    applyTransform();
}

function zoomImage(delta) {
    currentZoom = currentZoom + delta;
    if (currentZoom < 0.5) currentZoom = 0.5;
    applyTransform();
}

function resetImage() {
    currentRotation = 0;
    currentZoom = 1;
    applyTransform();
}

function applyTransform() {
    const img = document.getElementById('enlargedImage');
    img.style.transform = `rotate(${currentRotation}deg) scale(${currentZoom})`;
}

// ==================== QUESTION NAVIGATOR FUNCTIONS ====================
function toggleNavigator() {
    const grid = document.getElementById('questionGrid');
    const toggle = document.getElementById('navigatorToggle');
    const header = document.querySelector('.navigator-header');
    
    if (!grid || !toggle) return;
    
    grid.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
    
    if (grid.classList.contains('collapsed')) {
        toggle.style.transform = 'rotate(-90deg)';
    } else {
        toggle.style.transform = 'rotate(0deg)';
    }
}

function updateQuestionNavigator() {
    const grid = document.getElementById('questionGrid');
    if (!grid || !categoryQuestions.length) return;
    
    let html = '';
    
    categoryQuestions.forEach((question, index) => {
        let statusClass = 'unanswered';
        
        // Check if this question has been answered
        if (question.answered !== undefined) {
            statusClass = question.answered ? 'answered-correct' : 'answered-incorrect';
        }
        
        // Add current class if this is the current question
        if (index === currentQuestionIndex) {
            statusClass += ' current';
        }
        
        html += `<div class="question-number ${statusClass}" onclick="jumpToQuestion(${index})">${index + 1}</div>`;
    });
    
    grid.innerHTML = html;
}

function jumpToQuestion(index) {
    if (index >= 0 && index < categoryQuestions.length) {
        currentQuestionIndex = index;
        displayQuestion();
        updateProgress();
        updateQuestionNavigator();
        showMessage(`Jumped to question ${index + 1}`, "info");
    }
}

// ==================== QUIZ FUNCTIONS ====================
function displayQuestion() {
    if (!categoryQuestions || categoryQuestions.length === 0) {
        document.getElementById('questionDisplay').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available.
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
    
    // Display multiple images if available
    if (question.images && question.images.length > 0) {
        html += `<div class="multiple-images-container">`;
        
        question.images.forEach((imagePath, index) => {
            let imageName = extractImageName(imagePath);
            
            html += `
                <div class="chart-image">
                    <img src="${imagePath}" alt="${imageName}" 
                         onerror="handleImageError(this, '${encodeURIComponent(imagePath)}')"
                         style="width: 100%; height: 200px; object-fit: contain; cursor: pointer; border-radius: 6px; border: 2px solid #e0e7ff;"
                         onclick="viewImage('${encodeURIComponent(imagePath)}')">
                    <div class="image-label">
                        <i class="fas fa-image"></i> Chart ${index + 1} - Click to enlarge
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    let optionClass = "answer-option";
    let disabled = "";
    let onclickAction = `onclick="selectAnswer(${index})"`;

    // If show answers mode is enabled
    if (showAnswersMode) {
        disabled = "disabled";
        onclickAction = "";

        if (index === question.currentCorrect) {
            optionClass += " answer-correct";
        }
    }

    html += `
        <button class="${optionClass}" ${onclickAction} ${disabled}>
            <strong>${letter}.</strong> ${option}
        </button>
    `;
    html += '</div></div>';
    
    container.innerHTML = html;
    
    document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
    document.getElementById('totalCounter').textContent = categoryQuestions.length;
    
    document.getElementById('prevButton').disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === categoryQuestions.length - 1;
    const nextBtn = document.getElementById('nextButton');
    nextBtn.classList.remove('next-emphasis');
    nextBtn.disabled = false;
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    nextBtn.style.background = 'var(--primary-blue)';
    nextBtn.style.color = 'white';
    
    resetAnswerButtons();
    
    // Update the question navigator
    updateQuestionNavigator();
}

function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    buttons.forEach(btn => btn.disabled = true);
    
    buttons.forEach((btn, index) => {
        if (index === question.currentCorrect) {
            btn.classList.add('answer-correct');
        }
        if (index === selectedIndex && index !== question.currentCorrect) {
            btn.classList.add('answer-incorrect');
        }
    });
    
    // Mark question as answered
    userScore.attempted++;
    question.answered = (selectedIndex === question.currentCorrect);
    
    if (selectedIndex === question.currentCorrect) {
        userScore.correct++;
        const correctBtn = buttons[selectedIndex];
        correctBtn.classList.add('auto-advance');
        
        showMessage("Correct! ✓ Auto-advancing to next question...", "success");
        
        setTimeout(() => {
            if (currentQuestionIndex < categoryQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion();
                updateProgress();
            } else {
                showMessage("Category completed! Review your statistics.", "success");
                updateStatistics();
                nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
            }
        }, 1500);
        
    } else {
        nextBtn.classList.add('next-emphasis');
        showMessage("Incorrect ✗ Click 'Next' to continue", "error");
        
        setTimeout(() => {
            nextBtn.classList.remove('next-emphasis');
        }, 5000);
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
    updateQuestionNavigator(); // Update navigator colors
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    buttons.forEach(btn => {
        btn.classList.remove('answer-correct', 'answer-incorrect', 'auto-advance');
        btn.disabled = false;
    });
    
    nextBtn.classList.remove('next-emphasis');
}

function nextQuestion() {
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        showMessage("Category completed! Review your statistics.", "success");
        updateStatistics();
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
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== '') {
        performSearch(searchInput.value);
    } else {
        displayCategories();
    }
    
    showMessage("Returned to category selection", "info");
}

// ==================== SHUFFLING FUNCTIONS ====================
// Shuffle all questions and stay at current position
function randomizeQuestions() {
    if (!categoryQuestions.length) return;
    
    // Store the current position (we want to stay at this position number)
    const currentPosition = currentQuestionIndex;
    
    // Shuffle ALL questions
    shuffleArray(categoryQuestions);
    
    // Stay at the same position number (now showing a different question)
    currentQuestionIndex = currentPosition;
    
    displayQuestion();
    updateProgress();
    updateQuestionNavigator();
    showMessage(`Questions shuffled! You're still on question ${currentPosition + 1}`, "info");
}

// Shuffle answers for ALL questions
function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    // Shuffle answers for EVERY question in the category
    categoryQuestions.forEach(question => {
        shuffleQuestionAnswers(question);
    });
    
    // Redisplay current question with its shuffled answers
    displayQuestion();
    showMessage("Answers shuffled for ALL questions", "info");
}

// Shuffle just the answers for a specific question
function shuffleQuestionAnswers(question) {
    if (!question) return;
    
    const correctAnswerText = question.currentOptions[question.currentCorrect];
    const shuffledOptions = [...question.currentOptions];
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

// Reset current question's answers to original order
function resetCurrentQuestionAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    question.currentOptions = [...question.originalOptions];
    question.currentCorrect = question.originalCorrect;
    questionShuffledState.delete(question.id);
    
    displayQuestion();
    showMessage("Answers restored to original order", "info");
}

// Helper function to shuffle array (used by multiple functions)
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
