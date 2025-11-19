document.addEventListener('DOMContentLoaded', () => {
    const toolsConfig = {
        removebg: {
            name: 'Remove Background',
            description: 'Automatically remove the background from an image with high precision in just a few seconds.',
            buttonText: 'Remove',
            demo: { aspectRatio: '1200 / 700', before: 'https://files.catbox.moe/dlimod.png', after: 'https://files.catbox.moe/z4l6ea.png' }
        },
        enhance: {
            name: 'Enhance',
            description: 'Automatically improve the quality, sharpness, and colors of your image for a brighter, clearer result.',
            buttonText: 'Enhance',
            demo: { aspectRatio: '1200 / 700', before: 'https://files.catbox.moe/1pxxl6.jpg', after: 'https://files.catbox.moe/zxqmsw.png' }
        },
        upscale: {
            name: 'Upscale',
            description: 'Enlarge your image\'s resolution up to 10x without significant loss of detail quality.',
            buttonText: 'Upscale',
            demo: { aspectRatio: '1200 / 700', before: 'https://files.catbox.moe/kzvbhy.jpg', after: 'https://files.catbox.moe/ho0az9.png' }
        },
        restore: {
            name: 'Restore',
            description: 'Fix old, damaged, scratched, or faded photos to look like new again with AI technology.',
            buttonText: 'Restore',
            demo: { aspectRatio: '1200 / 700', before: 'https://files.catbox.moe/x4v1z0.jpg', after: 'https://files.catbox.moe/oi2rh8.jpg' }
        },
        colorize: {
            name: 'Colorize',
            description: 'Realistically colorize black and white photos and bring your memories back to life.',
            buttonText: 'Colorize',
            demo: { aspectRatio: '1200 / 700', before: 'https://files.catbox.moe/hf7t5g.jpg', after: 'https://files.catbox.moe/aivymb.jpg' }
        }
    };

    const slugify = text => text.toLowerCase().replace(/\s+/g, '-');
    const tool_slugs = Object.fromEntries(Object.keys(toolsConfig).map(key => [slugify(toolsConfig[key].name), key]));
    const tool_key_by_slug = Object.fromEntries(Object.keys(toolsConfig).map(key => [key, slugify(toolsConfig[key].name)]));
    
    if (window.location.pathname === '/') {
        const firstToolKey = Object.keys(toolsConfig)[0];
        const firstToolSlug = tool_key_by_slug[firstToolKey];
        history.replaceState({ tool: firstToolKey }, '', `/${firstToolSlug}`);
    }

    const toolNav = document.getElementById('tool-nav');
    const toolMain = document.getElementById('tool-main');
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const notFoundSection = document.getElementById('not-found-section');
    
    let cropper = null;
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const applyCropButton = document.getElementById('apply-crop-button');
    const cancelCropButton = document.getElementById('cancel-crop-button');
    const cropWidthInput = document.getElementById('crop-width-input');
    const cropHeightInput = document.getElementById('crop-height-input');
    const aspectRatioBtns = document.querySelectorAll('.aspect-ratio-btn');

    Object.keys(toolsConfig).forEach((key) => {
        const tool = toolsConfig[key];
        const button = document.createElement('a');
        button.href = `/${slugify(tool.name)}`;
        button.className = 'tool-button';
        button.dataset.tool = key;
        button.textContent = tool.name;
        if (tool.isNew) {
            const newLabel = document.createElement('span');
            newLabel.className = 'new-label';
            newLabel.textContent = 'NEW';
            button.appendChild(newLabel);
        }
        toolNav.appendChild(button);
        const section = document.createElement('section');
        section.id = key;
        section.className = 'tool-content';
        section.innerHTML = `
            <h2>${tool.name}</h2>
            <p class="description">${tool.description}</p>
            <div class="ba-slider" style="aspect-ratio: ${tool.demo.aspectRatio};">
                <div class="image-wrapper before-image"><img src="${tool.demo.before}" alt="Before"><span class="label before">Before</span></div>
                <div class="image-wrapper after-image"><img src="${tool.demo.after}" alt="After"><span class="label after">After</span></div>
                <div class="handle"><div class="arrow"></div></div>
            </div>
        `;
        toolMain.appendChild(section);
    });
    
    const removeBgPreviewAfter = document.querySelector('#removebg .ba-slider .after-image');
    if (removeBgPreviewAfter) {
        removeBgPreviewAfter.classList.add('checkerboard-bg');
    }

    const toolButtons = document.querySelectorAll('.tool-button');
    const toolContents = document.querySelectorAll('.tool-content');
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const resultBox = document.getElementById('result-box');
    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const uploadOverlay = document.getElementById('upload-overlay');
    const improveButton = document.getElementById('improve-button');
    const processingSection = document.getElementById('processing-section');
    const statusText = document.getElementById('status-text');
    const loader = document.getElementById('loader');
    const resultSliderWrapper = document.getElementById('result-slider-wrapper');
    const resultSlider = document.getElementById('result-slider');
    const resultBeforeImg = document.getElementById('result-before-img');
    const resultAfterImg = document.getElementById('result-after-img');
    const resultAfterWrapper = document.querySelector('#result-slider .after-image');
    const resultButtons = document.querySelector('.result-buttons');
    const downloadButton = document.getElementById('download-button');
    const redoButton = document.getElementById('redo-button');
    const upscaleLevelGroup = document.getElementById('upscale-level-group');
    const upscaleLevelSelect = document.getElementById('upscale-level');
    const targetFormatGroup = document.getElementById('target-format-group');
    const imageQualityGroup = document.getElementById('image-quality-group');
    const needCompressSelect = document.getElementById('need-compress');
    const compressLevelSelect = document.getElementById('compress-level');
    const navScrollbarThumb = document.querySelector('.nav-scrollbar-thumb');

    let activeTool = null;
    let originalFile = null;
    let uploadedFileUrl = null;

    const update_options_ui = () => {
        if (!activeTool) return;
        const tool = toolsConfig[activeTool];
        improveButton.textContent = tool.buttonText || 'Process';

        const isUpscaleTool = activeTool === 'upscale';
        upscaleLevelGroup.style.display = isUpscaleTool ? 'flex' : 'none';

        const isHighScale = isUpscaleTool && ['6', '8', '10'].includes(upscaleLevelSelect.value);

        targetFormatGroup.classList.toggle('disabled', isHighScale);
        needCompressSelect.parentElement.classList.toggle('disabled', isHighScale);

        if (isHighScale || needCompressSelect.value === 'no') {
            imageQualityGroup.classList.add('disabled');
            compressLevelSelect.parentElement.classList.add('disabled');
        } else {
            imageQualityGroup.classList.remove('disabled');
            compressLevelSelect.parentElement.classList.remove('disabled');
        }
    };

    const set_active_tool = (toolKey) => {
        if (!toolsConfig[toolKey]) return;
        activeTool = toolKey;
        
        toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === toolKey));
        toolContents.forEach(content => content.classList.toggle('active', content.id === toolKey));
        
        toolMain.style.display = 'block';
        notFoundSection.style.display = 'none';
        mainContentWrapper.style.display = 'block';

        update_options_ui();
        resultBox.style.display = 'none';
        originalFile = null;
        uploadedFileUrl = null;
    };

    const not_found_page = () => {
        toolMain.style.display = 'none';
        mainContentWrapper.style.display = 'none';
        notFoundSection.style.display = 'block';
        document.title = '404 Not Found';
    };

    const handle_route_change = () => {
        const path = window.location.pathname;
        const slug = path.substring(1);

        if (tool_slugs[slug]) {
            const toolKey = tool_slugs[slug];
            set_active_tool(toolKey);
            document.title = `${toolsConfig[toolKey].name}`;
        } else {
            not_found_page();
        }
    };
    
    toolButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const toolKey = button.dataset.tool;
            const url = button.href;
            if (window.location.pathname !== url.replace(window.location.origin, '')) {
                history.pushState({ tool: toolKey }, '', url);
            }
            set_active_tool(toolKey);
            document.title = `${toolsConfig[toolKey].name}`;
        });
    });

    window.addEventListener('popstate', handle_route_change);
    
    function data_url_to_blob(dataurl) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }

    applyCropButton.addEventListener('click', () => {
        const croppedCanvas = cropper.getCroppedCanvas();
        const dataUrl = croppedCanvas.toDataURL(originalFile.type);
        const blob = data_url_to_blob(dataUrl);

        previewImage.src = dataUrl;
        resultBeforeImg.src = dataUrl;
        
        resultBox.style.display = 'flex';
        previewSection.style.display = 'flex';
        processingSection.style.display = 'none';
        resultSliderWrapper.style.display = 'none';
        resultButtons.style.display = 'none';
        update_options_ui();
        
        pre_upload_file(blob, originalFile.name);

        cropModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        cropper.destroy();
        cropper = null;
    });

    cancelCropButton.addEventListener('click', () => {
        cropModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        cropper.destroy();
        cropper = null;
        fileInput.value = null;
    });

    aspectRatioBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            if (!cropper) return;
            aspectRatioBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            cropper.setAspectRatio(parseFloat(e.currentTarget.dataset.ratio));
        });
    });
    
    const handle_manual_crop_change = () => {
        if (!cropper) return;
        const data = cropper.getData();
        const newWidth = parseFloat(cropWidthInput.value);
        const newHeight = parseFloat(cropHeightInput.value);
        cropper.setData({
            ...data,
            width: isNaN(newWidth) ? data.width : newWidth,
            height: isNaN(newHeight) ? data.height : newHeight,
        });
    };
    cropWidthInput.addEventListener('change', handle_manual_crop_change);
    cropHeightInput.addEventListener('change', handle_manual_crop_change);

    async function pre_upload_file(file, fileName) {
        uploadOverlay.style.display = 'flex';
        improveButton.disabled = true;
        try {
            const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
            const getUrlResponse = await fetch("https://pxpic.com/getSignedUrl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folder: "uploads", fileName: uniqueFileName })
            });
            if (!getUrlResponse.ok) throw new Error('Failed to get signed URL.');
            const data = await getUrlResponse.json();

            const uploadResponse = await fetch(data.presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            });
            if (!uploadResponse.ok) throw new Error('File upload to FotoEnhancer failed.');

            uploadedFileUrl = "https://files.fotoenhancer.com/uploads/" + uniqueFileName;
        } catch(error) {
            console.error('Pre-upload failed:', error);
            statusText.textContent = `Upload failed: ${error.message}`;
            uploadedFileUrl = null;
        } finally {
            uploadOverlay.style.display = 'none';
            improveButton.disabled = false;
        }
    }

    function handle_file(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.'); return;
        }
        originalFile = file;
        uploadedFileUrl = null;
        
        const reader = new FileReader();
        reader.onload = e => {
            imageToCrop.src = e.target.result;
            cropModal.style.display = 'flex';
            document.body.classList.add('modal-open');
            cropper = new Cropper(imageToCrop, {
                viewMode: 1,
                autoCropArea: 0.8,
                background: false,
                minCropBoxWidth: 50,
                minCropBoxHeight: 50,
                crop(event) {
                    cropWidthInput.value = Math.round(event.detail.width);
                    cropHeightInput.value = Math.round(event.detail.height);
                    const currentRatio = event.detail.width / event.detail.height;
                    let foundMatch = false;
                    aspectRatioBtns.forEach(btn => {
                        const btnRatio = parseFloat(btn.dataset.ratio);
                        const isActive = Math.abs(currentRatio - btnRatio) < 0.001 || (isNaN(currentRatio) && isNaN(btnRatio));
                        btn.classList.toggle('active', isActive);
                        if (isActive) foundMatch = true;
                    });
                    if (!foundMatch && !isNaN(currentRatio)) {
                        document.querySelector('.aspect-ratio-btn[data-ratio="NaN"]').classList.add('active');
                    }
                },
            });
            document.querySelector('.aspect-ratio-btn[data-ratio="NaN"]').classList.add('active');
        };
        reader.readAsDataURL(file);
        fileInput.value = null;
    }

    async function download_image(url, filename) {
        try {
            downloadButton.textContent = 'Downloading...';
            downloadButton.disabled = true;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const name = filename.substring(0, filename.lastIndexOf('.')) || 'image';
            const toolName = toolsConfig[activeTool].name.toLowerCase().replace(/\s+/g, '-');
            const extension = blob.type.split('/')[1] || 'png';
            link.download = `${name}-${toolName}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        } finally {
            downloadButton.textContent = 'Download';
            downloadButton.disabled = false;
        }
    }
    
    downloadButton.addEventListener('click', () => {
        download_image(resultAfterImg.src, originalFile.name);
    });

    redoButton.addEventListener('click', () => {
        if (improveButton) {
            improveButton.click();
        }
    });

    improveButton.addEventListener('click', async () => {
        if (!uploadedFileUrl) {
            alert("File is not uploaded yet. Please wait.");
            return;
        }
        resultSliderWrapper.style.display = 'none';
        resultButtons.style.display = 'none';
        previewSection.style.display = 'none';
        processingSection.style.display = 'flex';
        loader.style.display = 'inline-block';
        statusText.textContent = `Processing with ${toolsConfig[activeTool].name}...`;
        try {
            const options = {
                targetFormat: document.getElementById('target-format').value,
                imageQuality: document.getElementById('image-quality').value,
                upscalingLevel: upscaleLevelSelect.value,
                needCompress: needCompressSelect.value,
                compressLevel: compressLevelSelect.value,
            };
            const resultUrl = await process_image(uploadedFileUrl, activeTool, options);
            if (!resultUrl) throw new Error('API did not return a valid output URL.');
            resultAfterImg.src = resultUrl;
            resultAfterImg.onload = () => {
                const img = new Image();
                img.src = resultBeforeImg.src;
                img.onload = () => {
                    resultAfterWrapper.classList.remove('checkerboard-bg');
                    if(activeTool === 'removebg') {
                       resultAfterWrapper.classList.add('checkerboard-bg');
                    }
                    resultSlider.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    processingSection.style.display = 'none';
                    resultSliderWrapper.style.display = 'flex';
                    resultButtons.style.display = 'flex';
                    redoButton.textContent = `${toolsConfig[activeTool].buttonText} Again`;
                    init_slider(resultSlider);
                };
                 img.onerror = () => { throw new Error('Failed to load the original image for sizing.'); }
            };
            resultAfterImg.onerror = () => { throw new Error('Failed to load the processed image.'); }
        } catch (error) {
            console.error('Error:', error);
            loader.style.display = 'none';
            statusText.textContent = `An error occurred: ${error.message}`;
        }
    });

    async function process_image(imageUrl, func, options) {
        const highScaleLevels = ['6', '8', '10'];
        if (func === 'upscale' && highScaleLevels.includes(options.upscalingLevel)) {
            const apiResponse = await fetch(`https://api.siputzx.my.id/api/tools/upscale?url=${encodeURIComponent(imageUrl)}&scale=${options.upscalingLevel}`);
            if (!apiResponse.ok) throw new Error('External upscale API failed.');
            const imageBlob = await apiResponse.blob();
            if (!imageBlob.type.startsWith('image/')) throw new Error('External API did not return a valid image.');
            return URL.createObjectURL(imageBlob);
        } else {
            const params = new URLSearchParams({ 
                imageUrl, aiFunction: func, targetFormat: options.targetFormat, imageQuality: options.imageQuality, 
                upscalingLevel: options.upscalingLevel, needCompress: options.needCompress, compressLevel: options.compressLevel, 
                fileOriginalExtension: 'png' 
            });
            const apiResponse = await fetch("https://pxpic.com/callAiFunction", { method: "POST", headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            if (!apiResponse.ok) throw new Error('AI processing failed.');
            const data = await apiResponse.json();
            return data.resultImageUrl || null;
        }
    }
    
    function init_slider(slider) {
        let isDragging = false;
        const updateSlider = (clientX) => {
            const sliderRect = slider.getBoundingClientRect();
            let pos = (clientX - sliderRect.left) / sliderRect.width;
            pos = Math.max(0, Math.min(1, pos));
            slider.style.setProperty('--slider-pos', `${pos * 100}%`);
        };
        const onDrag = e => { if (!isDragging) return; e.preventDefault(); updateSlider(e.clientX || e.touches[0].clientX); };
        const startDrag = e => { e.preventDefault(); isDragging = true; document.body.style.cursor = 'ew-resize'; };
        const stopDrag = () => { isDragging = false; document.body.style.cursor = 'default'; };
        slider.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mouseleave', stopDrag);
        slider.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
        slider.style.setProperty('--slider-pos', '50%');
    }

    function init_nav_scroll() {
        const updateNavScrollbar = () => {
            const { scrollLeft, scrollWidth, clientWidth } = toolNav;
            if (scrollWidth > clientWidth) {
                const thumbWidth = (clientWidth / scrollWidth) * 100;
                const thumbLeft = (scrollLeft / scrollWidth) * 100;
                navScrollbarThumb.style.width = `${thumbWidth}%`;
                navScrollbarThumb.style.left = `${thumbLeft}%`;
                navScrollbarThumb.parentElement.style.display = 'block';
            } else {
                navScrollbarThumb.parentElement.style.display = 'none';
            }
        };
        toolNav.addEventListener('scroll', updateNavScrollbar);
        new ResizeObserver(updateNavScrollbar).observe(toolNav);
        updateNavScrollbar();
    }
    
    uploadBox.addEventListener('click', () => fileInput.click());
    uploadBox.addEventListener('dragover', e => { e.preventDefault(); uploadBox.style.backgroundColor = '#202035'; });
    uploadBox.addEventListener('dragleave', () => uploadBox.style.backgroundColor = 'var(--color-secondary-bg)');
    uploadBox.addEventListener('drop', e => {
        e.preventDefault();
        uploadBox.style.backgroundColor = 'var(--color-secondary-bg)';
        if (e.dataTransfer.files.length > 0) handle_file(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => { if (e.target.files.length > 0) handle_file(e.target.files[0]); });
    
    needCompressSelect.addEventListener('change', update_options_ui);
    upscaleLevelSelect.addEventListener('change', update_options_ui);

    document.querySelectorAll('.ba-slider').forEach(init_slider);
    init_nav_scroll();
    handle_route_change();
});
