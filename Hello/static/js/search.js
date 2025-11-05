document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('searchForm');
    const queryInput = document.getElementById('searchQuery');
    const instanceSelect = document.getElementById('invidiousInstance');
    const searchBtn = document.getElementById('searchBtn');
    
    // State elements
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resultsState = document.getElementById('resultsState');
    const errorMessage = document.getElementById('errorMessage');
    const searchResults = document.getElementById('searchResults');

    function hideAllStates() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        resultsState.style.display = 'none';
    }

    function showLoading() {
        hideAllStates();
        loadingState.style.display = 'block';
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>検索中...';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-feather="search" class="me-2"></i>検索する';
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
        if (!seconds) return '不明';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    function formatViewCount(views) {
        if (!views) return '不明';
        
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1)}M回視聴`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}K回視聴`;
        } else {
            return `${views}回視聴`;
        }
    }

    function formatPublishDate(publishedText) {
        if (!publishedText) return '不明';
        return publishedText;
    }

    function extractVideo(videoId) {
        // Show loading state for this specific video
        const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
        const playBtn = videoCard.querySelector('.play-btn');
        const originalText = playBtn.innerHTML;
        
        playBtn.disabled = true;
        playBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>取得中...';
        
        // Create YouTube URL from video ID
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Send request to extract video
        fetch('/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: youtubeUrl
            })
        })
        .then(response => response.json())
        .then(data => {
            playBtn.disabled = false;
            playBtn.innerHTML = originalText;
            feather.replace();
            
            if (data.success && data.video && data.video.formats && data.video.formats.length > 0) {
                // Show video formats modal
                showVideoFormats(data.video);
            } else {
                alert(data.error || 'MP4リンクの取得に失敗しました');
            }
        })
        .catch(error => {
            playBtn.disabled = false;
            playBtn.innerHTML = originalText;
            feather.replace();
            console.error('Video extraction error:', error);
            alert('エラーが発生しました: ' + error.message);
        });
    }
    
    function showVideoFormats(data) {
        // Create modal for video formats (similar to index.html)
        const modal = document.createElement('div');
        modal.className = 'modal fade show d-block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        let formatsHtml = '';
        data.formats.forEach((format, index) => {
            const quality = format.quality || `${format.height}p` || '不明';
            const filesize = format.filesize ? ` (${(format.filesize / 1024 / 1024).toFixed(1)}MB)` : '';
            const fps = format.fps ? ` ${format.fps}fps` : '';
            
            formatsHtml += `
                <div class="border rounded p-3 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${quality}${fps}</strong>
                            <div class="text-muted small">
                                ${format.format_id || 'MP4'}${filesize}
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-sm" onclick="window.open('${format.url}', '_blank')">
                                <i data-feather="play" class="me-1"></i>
                                再生
                            </button>
                            <button class="btn btn-success btn-sm" onclick="downloadVideo('${format.url}', '${data.title}', '${quality}')">
                                <i data-feather="download" class="me-1"></i>
                                ダウンロード
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="video" class="me-2"></i>
                            ${data.title}
                        </h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <small class="text-muted">
                                ${data.uploader ? `投稿者: ${data.uploader}` : ''}
                                ${data.duration ? ` • 再生時間: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : ''}
                            </small>
                        </div>
                        <h6>利用可能な画質:</h6>
                        ${formatsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        feather.replace();
        
        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    function displayResults(results, instance) {
        hideAllStates();
        hideLoading();

        if (!results || results.length === 0) {
            showError('検索結果が見つかりませんでした');
            return;
        }

        searchResults.innerHTML = '';
        
        results.forEach((video, index) => {
            const resultCard = document.createElement('div');
            resultCard.className = 'border-bottom p-3 video-result-card';
            resultCard.setAttribute('data-video-id', video.videoId);
            
            const thumbnailUrl = video.videoThumbnails && video.videoThumbnails.length > 0 
                ? video.videoThumbnails[0].url 
                : '';

            const publishedText = formatPublishDate(video.publishedText);
            const viewCount = formatViewCount(video.viewCount);
            const duration = formatDuration(video.lengthSeconds);

            resultCard.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-4 col-lg-3">
                        <div class="position-relative">
                            ${thumbnailUrl ? `
                                <img src="${thumbnailUrl}" 
                                     class="img-fluid rounded w-100" 
                                     alt="動画サムネイル"
                                     style="aspect-ratio: 16/9; object-fit: cover;">
                            ` : `
                                <div class="bg-secondary rounded d-flex align-items-center justify-content-center" 
                                     style="aspect-ratio: 16/9;">
                                    <i data-feather="video" class="text-muted"></i>
                                </div>
                            `}
                            ${video.lengthSeconds ? `
                                <span class="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white px-2 py-1 rounded-start text-sm">
                                    ${duration}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col-md-8 col-lg-9">
                        <div class="d-flex flex-column h-100">
                            <div class="flex-grow-1">
                                <h6 class="mb-2 video-title">
                                    <span class="text-light">
                                        ${video.title}
                                    </span>
                                </h6>
                                
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i data-feather="user" class="me-1"></i>
                                        ${video.author || '不明なチャンネル'}
                                    </small>
                                </div>
                                
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i data-feather="eye" class="me-1"></i>
                                        ${viewCount}
                                        ${publishedText ? `• ${publishedText}` : ''}
                                    </small>
                                </div>
                                
                                ${video.description ? `
                                    <p class="text-muted small mb-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                        ${video.description}
                                    </p>
                                ` : ''}
                            </div>
                            
                            <div class="d-flex gap-2 mt-2">
                                <button class="btn btn-primary btn-sm play-btn" 
                                        onclick="extractVideo('${video.videoId}')">
                                    <i data-feather="play" class="me-1"></i>
                                    MP4取得・再生
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" 
                                        onclick="copyToClipboard('https://www.youtube.com/watch?v=${video.videoId}')">
                                    <i data-feather="copy" class="me-1"></i>
                                    YouTubeリンクコピー
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            searchResults.appendChild(resultCard);
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
                            リンクをコピーしました！
                        </div>
                    </div>
                `;
                document.body.appendChild(toast);
                feather.replace();
                
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 3000);
            }).catch(() => {
                alert('リンクのコピーに失敗しました');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('リンクをコピーしました！');
            } catch (err) {
                alert('リンクのコピーに失敗しました');
            }
            document.body.removeChild(textArea);
        }
    };

    // Download function
    window.downloadVideo = function(url, title, quality) {
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
                    ダウンロードを開始しました
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        feather.replace();
        
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 3000);
    };
    
    // Global functions
    window.extractVideo = extractVideo;

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const query = queryInput.value.trim();
        const instance = instanceSelect.value;
        
        if (!query) {
            showError('検索キーワードを入力してください');
            return;
        }

        showLoading();

        try {
            const response = await fetch('/search-videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    query: query,
                    instance: instance
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '検索中にエラーが発生しました');
            }

            if (data.success && data.results) {
                // Show success message if fallback was used
                if (data.used_fallback) {
                    const toast = document.createElement('div');
                    toast.className = 'position-fixed top-0 end-0 p-3';
                    toast.style.zIndex = '1055';
                    toast.innerHTML = `
                        <div class="toast show bg-warning" role="alert">
                            <div class="toast-body text-dark">
                                <i data-feather="info" class="me-2"></i>
                                ${data.method === 'yt-dlp' ? 'yt-dlp直接検索を使用しました' : `${data.instance}サーバーを使用しました`}
                                ${instance && instance !== 'auto' && data.instance !== instance ? `（${instance}は利用不可）` : ''}
                            </div>
                        </div>
                    `;
                    document.body.appendChild(toast);
                    feather.replace();
                    
                    setTimeout(() => {
                        if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                        }
                    }, 5000);
                }
                
                displayResults(data.results, data.instance);
            } else {
                throw new Error('無効なレスポンス形式です');
            }

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || '予期しないエラーが発生しました');
        }
    });

    // Clear results when query changes
    queryInput.addEventListener('input', function() {
        if (resultsState.style.display !== 'none' || errorState.style.display !== 'none') {
            hideAllStates();
        }
    });
});