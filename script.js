document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const result = document.getElementById('result');
    const loading = document.getElementById('loading');
    const langSelect = document.getElementById('langSelect');

    // Check if Tesseract is loaded
    if (typeof Tesseract === 'undefined') {
        result.textContent = 'Error: Tesseract.js library failed to load. Please refresh the page.';
        return;
    }

    // Language specific settings
    const languageSettings = {
        eng: { direction: 'ltr', fontFamily: "'Segoe UI', sans-serif" },
        hin: { direction: 'ltr', fontFamily: "'Noto Sans Devanagari', sans-serif" },
        tel: { direction: 'ltr', fontFamily: "'Noto Sans Telugu', sans-serif" },
        tam: { direction: 'ltr', fontFamily: "'Noto Sans Tamil', sans-serif" },
        'eng+hin': { direction: 'ltr', fontFamily: "'Noto Sans', 'Noto Sans Devanagari', sans-serif" },
        'eng+tel': { direction: 'ltr', fontFamily: "'Noto Sans', 'Noto Sans Telugu', sans-serif" },
        'eng+tam': { direction: 'ltr', fontFamily: "'Noto Sans', 'Noto Sans Tamil', sans-serif" }
    };

    // Add font links dynamically
    const fonts = [
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari&display=swap",
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu&display=swap",
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil&display=swap"
    ];

    fonts.forEach(font => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = font;
        document.head.appendChild(link);
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Display image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                result.textContent = '';
                performOCR(e.target.result);
            };
            reader.onerror = (error) => {
                result.textContent = 'Error reading image file: ' + error.message;
            };
            reader.readAsDataURL(file);
        }
    });

    async function performOCR(imageUrl) {
        let worker = null;
        try {
            loading.style.display = 'block';
            result.textContent = 'Initializing OCR...';
            
            // Initialize Tesseract worker
            worker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        result.textContent = `Processing: ${Math.round(m.progress * 100)}%`;
                    } else if (m.status === 'loading language traineddata') {
                        result.textContent = `Loading language data: ${Math.round(m.progress * 100)}%`;
                    }
                }
            });

            // Get selected language
            const selectedLang = langSelect.value;
            
            // Load language data
            await worker.loadLanguage(selectedLang);
            await worker.initialize(selectedLang);

            // Set page segmentation mode and other parameters
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1',
                tessedit_enable_dict_correction: '1',
                tessedit_enable_shape_words: '1'
            });
            
            // Perform OCR
            const { data } = await worker.recognize(imageUrl);
            
            // Display result
            if (data && data.text) {
                const langSettings = languageSettings[selectedLang];
                result.style.direction = langSettings.direction;
                result.style.fontFamily = langSettings.fontFamily;
                result.textContent = data.text;
                
                // Add confidence information
                const confidence = Math.round(data.confidence);
                const confidenceInfo = document.createElement('div');
                confidenceInfo.style.marginTop = '10px';
                confidenceInfo.style.fontSize = '0.9em';
                confidenceInfo.style.color = '#666';
                confidenceInfo.textContent = `Recognition Confidence: ${confidence}%`;
                result.appendChild(confidenceInfo);
            } else {
                throw new Error('No text was extracted from the image');
            }
            
        } catch (error) {
            console.error('OCR Error:', error);
            result.textContent = 'Error processing image: ' + (error.message || 'Unknown error occurred');
        } finally {
            if (worker) {
                try {
                    await worker.terminate();
                } catch (e) {
                    console.error('Error terminating worker:', e);
                }
            }
            loading.style.display = 'none';
        }
    }
}); 