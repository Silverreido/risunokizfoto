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
    
    // Текущее изображение
    let currentImage = null;
    
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
                    
                    currentImage = img;
                    
                    // Показываем секцию предпросмотра
                    previewSection.classList.remove('hidden');
                    
                    // Применяем эффект по умолчанию
                    applyDrawingEffect();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Обработчик перетаскивания файла
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
            // Создаем событие изменения для input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageUpload.files = dataTransfer.files;
            
            // Триггерим событие change
            const event = new Event('change', { bubbles: true });
            imageUpload.dispatchEvent(event);
        }
    });
    
    // Обработчик изменения интенсивности эффекта
    intensitySlider.addEventListener('input', function() {
        intensityValue.textContent = this.value;
        if (currentImage) {
            applyDrawingEffect();
        }
    });
    
    // Функция применения эффекта рисунка
    function applyDrawingEffect() {
        if (!currentImage) return;
        
        const intensity = parseInt(intensitySlider.value);
        
        // Копируем изображение с оригинального canvas на drawing canvas
        drawingCtx.drawImage(originalCanvas, 0, 0);
        
        // Получаем данные изображения
        const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
        const data = imageData.data;
        
        // Применяем фильтры для создания эффекта рисунка
        applySketchFilter(data, intensity);
        
        // Возвращаем обработанные данные на canvas
        drawingCtx.putImageData(imageData, 0, 0);
    }
    
    // Функция применения фильтра "рисунок"
    function applySketchFilter(data, intensity) {
        // Преобразуем в оттенки серого
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
        
        // Инвертируем цвета
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
        
        // Применяем размытие (чем выше интенсивность, тем сильнее размытие)
        applyBlurFilter(data, drawingCanvas.width, drawingCanvas.height, intensity / 10);
        
        // Смешиваем с оригиналом (режим осветления)
        const originalData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height).data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r1 = originalData[i] / 255;
            const r2 = data[i] / 255;
            
            let result = 0;
            if (r2 < 1) {
                result = Math.min(1, r1 / (1 - r2)) * 255;
            } else {
                result = 255;
            }
            
            data[i] = data[i + 1] = data[i + 2] = result;
        }
    }
    
    // Функция применения размытия по Гауссу
    function applyBlurFilter(data, width, height, radius) {
        const pixels = data;
        const tempPixels = new Uint8ClampedArray(pixels.length);
        
        // Горизонтальное размытие
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const index = (y * width + px) * 4;
                    
                    r += pixels[index];
                    g += pixels[index + 1];
                    b += pixels[index + 2];
                    a += pixels[index + 3];
                    count++;
                }
                
                const index = (y * width + x) * 4;
                tempPixels[index] = r / count;
                tempPixels[index + 1] = g / count;
                tempPixels[index + 2] = b / count;
                tempPixels[index + 3] = a / count;
            }
        }
        
        // Вертикальное размытие
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                for (let ky = -radius; ky <= radius; ky++) {
                    const py = Math.min(height - 1, Math.max(0, y + ky));
                    const index = (py * width + x) * 4;
                    
                    r += tempPixels[index];
                    g += tempPixels[index + 1];
                    b += tempPixels[index + 2];
                    a += tempPixels[index + 3];
                    count++;
                }
                
                const index = (y * width + x) * 4;
                pixels[index] = r / count;
                pixels[index + 1] = g / count;
                pixels[index + 2] = b / count;
                pixels[index + 3] = a / count;
            }
        }
    }
    
    // Обработчик кнопки применения эффекта
    applyEffectBtn.addEventListener('click', applyDrawingEffect);
    
    // Обработчик кнопки сброса
    resetBtn.addEventListener('click', function() {
        if (currentImage) {
            drawingCtx.drawImage(originalCanvas, 0, 0);
        }
    });
    
    // Обработчик кнопки сохранения
    downloadBtn.addEventListener('click', function() {
        if (!currentImage) return;
        
        const link = document.createElement('a');
        link.download = 'рисунок.png';
        link.href = drawingCanvas.toDataURL('image/png');
        link.click();
    });
});