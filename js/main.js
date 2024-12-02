document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const quality = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewContainer = document.querySelector('.preview-container');

    let originalFile = null;

    // 点击上传区域触发文件选择
    dropZone.addEventListener('click', () => fileInput.click());

    // 文件拖拽处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 文件选择处理
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 质量滑块变化处理
    quality.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
        if (originalFile) {
            compressImage(originalFile, e.target.value / 100);
        }
    });

    // 处理上传的文件
    function handleFile(file) {
        if (!file.type.match(/image\/(jpeg|png)/)) {
            alert('请上传 PNG 或 JPG 格式的图片！');
            return;
        }

        originalFile = file;
        previewContainer.style.display = 'block';
        
        // 显示原图大小
        originalSize.textContent = formatFileSize(file.size);
        
        // 预览原图
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            compressImage(file, quality.value / 100);
        };
        reader.readAsDataURL(file);
    }

    // 压缩图片
    async function compressImage(file, userQuality) {
        try {
            // 根据文件大小设置压缩选项
            const options = {
                maxSizeMB: 1,          // 目标大小
                maxWidthOrHeight: 2000, // 最大宽度/高度
                initialQuality: userQuality / 100,  // 初始质量
                useWebWorker: true,    // 使用 Web Worker 提高性能
                fileType: file.type,   // 保持原始文件类型
            };

            // 根据文件大小调整压缩参数
            if (file.size > 5 * 1024 * 1024) {        // 大于5MB
                options.maxSizeMB = file.size / (1024 * 1024 * 5);
                options.maxWidthOrHeight = 1500;
            } else if (file.size > 2 * 1024 * 1024) { // 大于2MB
                options.maxSizeMB = file.size / (1024 * 1024 * 2);
                options.maxWidthOrHeight = 1800;
            }

            // 显示原图
            originalImage.src = URL.createObjectURL(file);
            originalSize.textContent = formatFileSize(file.size);

            // 使用 browser-image-compression 进行压缩
            const compressedFile = await imageCompression(file, options);

            // 如果压缩后更大，尝试更激进的压缩
            if (compressedFile.size >= file.size) {
                const aggressiveOptions = {
                    ...options,
                    maxSizeMB: options.maxSizeMB * 0.7,
                    initialQuality: Math.min(0.7, options.initialQuality),
                };
                const secondAttempt = await imageCompression(file, aggressiveOptions);
                
                // 如果仍然更大，使用原图
                if (secondAttempt.size >= file.size) {
                    compressedImage.src = URL.createObjectURL(file);
                    compressedSize.textContent = `${formatFileSize(file.size)} (已是最优大小)`;
                    
                    downloadBtn.onclick = () => {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(file);
                        link.download = file.name;
                        link.click();
                    };
                    return;
                }
                
                // 使用二次压缩结果
                compressedFile = secondAttempt;
            }

            // 显示压缩结果
            compressedImage.src = URL.createObjectURL(compressedFile);
            const ratio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
            compressedSize.textContent = `${formatFileSize(compressedFile.size)} (减小了 ${ratio}%)`;

            // 更新下载按钮
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(compressedFile);
                link.download = `compressed_${file.name}`;
                link.click();
            };

            // 显示压缩信息
            console.log('压缩信息:', {
                原始大小: formatFileSize(file.size),
                压缩后大小: formatFileSize(compressedFile.size),
                压缩比例: ratio + '%',
                文件类型: compressedFile.type
            });

        } catch (error) {
            console.error('压缩过程中出错:', error);
            alert('图片压缩失败，请重试或选择其他图片');
        }
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 