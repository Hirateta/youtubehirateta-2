document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('extractForm');
    const urlInput = document.getElementById('youtubeUrl');
    const extractBtn = document.getElementById('extractBtn');
    
    // State elements
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resultsState = document.getElementById('resultsState');
    const errorMessage = document.getElementById('errorMessage');

    // Result elements
    const thumbnailCol = document.getElementById('thumbnailCol');
    const videoTitle = document.getElementById('videoTitle');
    const videoUploader = document.getElementById('videoUploader');
    const videoDuration = document.getElementById('videoDuration');
    const formatsList = document.getElementById('formatsList');

    function hideAllStates() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        resultsState.style.display = 'none';
    }

    function showLoading() {
        hideAllStates();
        loadingState.style.display = 'block';
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
        extractBtn.disabled = false;
        extractBtn.innerHTML = '<i data-feather="download" class="me-2"></i>Extract Video';
        feather.replace();
    }

    function showError(message) {
        hideAllStates();
        hideLoading();
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        feather.replace();
    }

    function formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    function openVideoInNewTab(url, title) {
        // Open the direct MP4 link in a new tab
        const newWindow = window.open(url, '_blank');
        
        if (!newWindow) {
            // If popup was blocked, show an alert
            alert('Popup blocked! Please allow popups for this site and try again.');
        } else {
            // Optional: You can also copy the URL to clipboard
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).then(() => {
                    console.log('Video URL copied to clipboard');
                }).catch(err => {
                    console.log('Failed to copy URL to clipboard:', err);
                });
            }
        }
    }

    function displayResults(videoData) {
        hideAllStates();
        hideLoading();

        // Set video info
        videoTitle.textContent = videoData.title;
        videoUploader.textContent = videoData.uploader;
        videoDuration.textContent = formatDuration(videoData.duration);

        // Set thumbnail
        if (videoData.thumbnail) {
            thumbnailCol.innerHTML = `
                <img src="${videoData.thumbnail}" 
                     class="img-fluid rounded" 
                     alt="Video thumbnail"
                     style="max-height: 120px; width: auto;">
            `;
        } else {
            thumbnailCol.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-secondary rounded" 
                     style="height: 120px;">
                    <i data-feather="image" class="text-muted"></i>
                </div>
            `;
        }

        // Display formats
        formatsList.innerHTML = '';
        
        videoData.formats.forEach((format, index) => {
            const formatCard = document.createElement('div');
            formatCard.className = 'card mb-2';
            
            let sizeInfo = '';
            if (format.filesize) {
                sizeInfo = `<small class="text-muted ms-2">(${formatFileSize(format.filesize)})</small>`;
            }

            let fpsInfo = '';
            if (format.fps) {
                fpsInfo = `<span class="badge bg-secondary ms-2">${format.fps}fps</span>`;
            }

            formatCard.innerHTML = `
                <div class="card-body py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                <i data-feather="monitor" class="me-2"></i>
                                ${format.quality}
                                ${sizeInfo}
                                ${fpsInfo}
                            </h6>
                            <small class="text-muted">Format ID: ${format.format_id}</small>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="openVideoInNewTab('${format.url}', '${videoData.title.replace(/'/g, "\\'")}')">
                                <i data-feather="external-link" class="me-1"></i>
                                Play
                            </button>
                            <button class="btn btn-outline-success btn-sm" 
                                    onclick="downloadVideoFile('${format.url}', '${videoData.title.replace(/'/g, "\\'")}', '${format.quality}')">
                                <i data-feather="download" class="me-1"></i>
                                Download
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" 
                                    onclick="copyToClipboard('${format.url}')">
                                <i data-feather="copy" class="me-1"></i>
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            formatsList.appendChild(formatCard);
        });

        resultsState.style.display = 'block';
        feather.replace();
    }

    // Global function for copying to clipboard
    window.copyToClipboard = function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                // Show a temporary success message
                const toast = document.createElement('div');
                toast.className = 'position-fixed top-0 end-0 p-3';
                toast.style.zIndex = '1055';
                toast.innerHTML = `
                    <div class="toast show" role="alert">
                        <div class="toast-body">
                            <i data-feather="check" class="me-2"></i>
                            URL copied to clipboard!
                        </div>
                    </div>
                `;
                document.body.appendChild(toast);
                feather.replace();
                
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 3000);
            }).catch(() => {
                alert('Failed to copy URL to clipboard');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('URL copied to clipboard!');
            } catch (err) {
                alert('Failed to copy URL to clipboard');
            }
            document.body.removeChild(textArea);
        }
    };

    // Global function for downloading video file
    window.downloadVideoFile = function(url, title, quality) {
        // Create a clean filename
        const cleanTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const cleanQuality = quality.replace(/[^\w]/g, '');
        const filename = `${cleanTitle}_${cleanQuality}.mp4`;
        
        // Create a temporary anchor element for download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Show download toast
        const toast = document.createElement('div');
        toast.className = 'position-fixed top-0 end-0 p-3';
        toast.style.zIndex = '1055';
        toast.innerHTML = `
            <div class="toast show bg-success" role="alert">
                <div class="toast-body text-white">
                    <i data-feather="download" class="me-2"></i>
                    Download started: ${filename}
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        feather.replace();
        
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 4000);
    };

    // Global function for opening video in new tab
    window.openVideoInNewTab = openVideoInNewTab;

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a YouTube URL');
            return;
        }

        showLoading();

        try {
            const response = await fetch('/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unknown error occurred');
            }

            if (data.success && data.video) {
                displayResults(data.video);
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An unexpected error occurred');
        }
    });

    // Clear results when URL changes
    urlInput.addEventListener('input', function() {
        if (resultsState.style.display !== 'none' || errorState.style.display !== 'none') {
            hideAllStates();
        }
    });
});
