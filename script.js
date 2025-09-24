document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const imageUpload = document.getElementById('image-upload');
    const originalCanvas = document.getElementById('original-canvas');
    const drawingCanvas = document.getElementById('drawing-canvas');
    const previewSection = document.querySelector('.preview-section');
    const applyEffectBtn = document.getElementById('apply-effect');
    const resetBtn = document.getElementById('reset');
    const downloadBtn = document.getElementById('download');
    const intensitySlider = document.getElementById('intensity');
    const intensityValue = document.getElementById('intensity-value');
    
    // Контексты canvas
    const originalCtx = originalCanvas.getContext('2d');
    const drawingCtx = drawingCanvas.getContext('2d');
    
    // Текущее изображение и таймер для debounce
    let currentImage = null;
    let updateTimeout = null;
    
    // Обработчик загрузки изображения
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Устанавливаем размеры canvas
                    const maxWidth = Math.min(700, img.width);
                    const ratio = maxWidth / img.width;
                    const height = img.height * ratio;
                    
                    originalCanvas.width = maxWidth;
                    originalCanvas.height = height;
                    drawingCanvas.width = maxWidth;
                    drawingCanvas.height = height;
                    
                    // Рисуем изображение на оригинальном canvas
                    originalCtx.drawImage(img, 0, 0, maxWidth, height);
                    drawingCtx.drawImage(img, 0, 0, maxWidth, height);
                    
                    currentImage = img;
                    
                    // Показываем секцию предпросмотра
                    previewSection.classList.remove('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Drag and drop
    const uploadSection = document.querySelector('.upload-section');
    uploadSection.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadSection.style.backgroundColor = '#f0f8ff';
    });
    
    uploadSection.addEventListener('dragleave', function() {
        uploadSection.style.backgroundColor = 'white';
    });
    
    uploadSection.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadSection.style.backgroundColor = 'white';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageUpload.files = dataTransfer.files;
            
            const event = new Event('change', { bubbles: true });
            imageUpload.dispatchEvent(event);
        }
    });
    
    // Debounce для ползунка интенсивности
    intensitySlider.addEventListener('input', function() {
        intensityValue.textContent = this.value;
        
        // Очищаем предыдущий таймер
        clearTimeout(updateTimeout);
        
        // Устанавливаем новый таймер (обновление через 300мс после остановки)
        updateTimeout = setTimeout(() => {
            if (currentImage) {
                applyDrawingEffect();
            }
        }, 300);
    });
    
    // Улучшенная функция применения эффекта рисунка
    function applyDrawingEffect() {
        if (!currentImage) return;
        
        const intensity = parseInt(intensitySlider.value);
        
        // Копируем оригинал
        drawingCtx.drawImage(originalCanvas, 0, 0);
        
        // Получаем данные изображения
        const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
        const data = imageData.data;
        
        // Применяем улучшенный фильтр
        applyImprovedSketchFilter(data, drawingCanvas.width, drawingCanvas.height, intensity);
        
        // Возвращаем обработанные данные
        drawingCtx.putImageData(imageData, 0, 0);
    }
    
    // Улучшенный алгоритм преобразования в рисунок
    function applyImprovedSketchFilter(data, width, height, intensity) {
        // Создаем временный буфер для серого изображения
        const grayData = new Uint8ClampedArray(width * height);
        
        // Конвертируем в оттенки серого
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            grayData[j] = gray;
        }
        
        // Применяем детектор краев (оператор Собеля)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Вычисляем градиенты по X и Y
                const gx = (
                    -grayData[(y-1)*width + (x-1)] + grayData[(y-1)*width + (x+1)] +
                    -2 * grayData[y*width + (x-1)] + 2 * grayData[y*width + (x+1)] +
                    -grayData[(y+1)*width + (x-1)] + grayData[(y+1)*width + (x+1)]
                );
                
                const gy = (
                    -grayData[(y-1)*width + (x-1)] - 2 * grayData[(y-1)*width + x] - grayData[(y-1)*width + (x+1)] +
                    grayData[(y+1)*width + (x-1)] + 2 * grayData[(y+1)*width + x] + grayData[(y+1)*width + (x+1)]
                );
                
                // Вычисляем величину градиента
                const gradient = Math.sqrt(gx * gx + gy * gy);
                
                // Нормализуем и инвертируем для эффекта рисунка
                let sketchValue = Math.min(255, gradient * (intensity * 0.5));
                sketchValue = 255 - sketchValue;
                
                // Устанавливаем результат для всех каналов
                data[idx] = sketchValue;     // R
                data[idx + 1] = sketchValue; // G
                data[idx + 2] = sketchValue; // B
                // Alpha остается без изменений
            }
        }
        
        // Обрабатываем границы (заполняем белым)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (y === 0 || y === height-1 || x === 0 || x === width-1) {
                    const idx = (y * width + x) * 4;
                    data[idx] = data[idx + 1] = data[idx + 2] = 255;
                }
            }
        }
    }
    
    // Обработчики кнопок
    applyEffectBtn.addEventListener('click', applyDrawingEffect);
    
    resetBtn.addEventListener('click', function() {
        if (currentImage) {
            drawingCtx.drawImage(originalCanvas, 0, 0);
        }
    });
    
    downloadBtn.addEventListener('click', function() {
        if (!currentImage) return;
        
        const link = document.createElement('a');
        link.download = 'рисунок-' + Date.now() + '.png';
        link.href = drawingCanvas.toDataURL('image/png');
        link.click();
    });
    
    // Предотвращаем перетаскивание файлов на всю страницу
    document.addEventListener('dragover', function(e) {
        if (e.target === uploadSection) return;
        e.preventDefault();
    });
    
    document.addEventListener('drop', function(e) {
        if (e.target === uploadSection) return;
        e.preventDefault();
    });
});
