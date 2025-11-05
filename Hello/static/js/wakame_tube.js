document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('wakameSearchForm');
    const queryInput = document.getElementById('wakameQuery');
    const searchBtn = document.getElementById('wakameSearchBtn');
    const loadingState = document.getElementById('wakameLoadingState');
    const errorState = document.getElementById('wakameErrorState');
    const resultsState = document.getElementById('wakameResultsState');
    const errorMessage = document.getElementById('wakameErrorMessage');
    const resultsList = document.getElementById('wakameResultsList');
    const resultsCount = document.getElementById('wakameResultsCount');

    function hideAllStates() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        resultsState.style.display = 'none';
    }

    function showLoading() {
        hideAllStates();
        loadingState.style.display = 'block';
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i data-feather="loader" class="me-2"></i>検索中...';
        feather.replace();
    }

    function showError(message) {
        hideAllStates();
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-feather="search" class="me-2"></i>検索';
        feather.replace();
    }

    function showResults(results) {
        hideAllStates();
        resultsCount.textContent = `${results.length}件`;
        resultsList.innerHTML = '';
        
        if (results.length === 0) {
            resultsList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i data-feather="search" class="text-muted mb-3" style="width: 48px; height: 48px;"></i>
                    <h5 class="text-muted">検索結果が見つかりませんでした</h5>
                    <p class="text-muted">別のキーワードで検索してみてください</p>
                </div>
            `;
        } else {
            results.forEach((video, index) => {
                const videoCard = createVideoCard(video, index);
                resultsList.appendChild(videoCard);
            });
        }
        
        resultsState.style.display = 'block';
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-feather="search" class="me-2"></i>検索';
        feather.replace();
    }

    function createVideoCard(video, index) {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';
        
        const duration = video.duration_formatted || '';
        const uploader = video.uploader || '不明';
        const views = video.views || '';
        const publishedTime = video.published_time || '';
        
        col.innerHTML = `
            <div class="card h-100 video-card">
                <div class="position-relative">
                    <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                    ${duration ? `<span class="badge bg-dark position-absolute bottom-0 end-0 m-2">${duration}</span>` : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title" title="${video.title}">
                        ${video.title.length > 60 ? video.title.substring(0, 60) + '...' : video.title}
                    </h6>
                    <div class="text-muted small mb-2">
                        <div>${uploader}</div>
                        ${views ? `<div>${views}回視聴</div>` : ''}
                        ${publishedTime ? `<div>${publishedTime}</div>` : ''}
                    </div>
                    <div class="mt-auto d-flex gap-2">
                        <button class="btn btn-primary btn-sm flex-fill" onclick="playVideo('${video.url}')">
                            <i data-feather="play" class="me-1"></i>
                            再生
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="extractVideo('${video.url}')">
                            <i data-feather="download" class="me-1"></i>
                            抽出
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    // Global functions
    window.playVideo = function(videoUrl) {
        window.open(videoUrl, '_blank');
    };

    window.extractVideo = function(videoUrl) {
        // Send to our extract endpoint
        fetch('/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: videoUrl })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.video && data.video.formats && data.video.formats.length > 0) {
                // Find the best quality format
                const bestFormat = data.video.formats.reduce((best, current) => {
                    const bestHeight = best.height || 0;
                    const currentHeight = current.height || 0;
                    return currentHeight > bestHeight ? current : best;
                });
                
                // Show download modal
                showDownloadModal(data.video, bestFormat);
            } else {
                alert('動画の抽出に失敗しました: ' + (data.error || '不明なエラー'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('動画の抽出中にエラーが発生しました');
        });
    };

    function showDownloadModal(video, format) {
        const modal = document.createElement('div');
        modal.className = 'modal fade show d-block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i data-feather="download" class="me-2"></i>
                            ${video.title}
                        </h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <small class="text-muted">
                                ${video.uploader ? `投稿者: ${video.uploader}` : ''}
                                ${video.duration ? ` • 再生時間: ${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : ''}
                            </small>
                        </div>
                        <div class="border rounded p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>${format.quality}</strong>
                                    <div class="text-muted small">
                                        ${format.format_id || 'MP4'}
                                        ${format.filesize ? ` (${(format.filesize / 1024 / 1024).toFixed(1)}MB)` : ''}
                                    </div>
                                </div>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-primary btn-sm" onclick="window.open('${format.url}', '_blank')">
                                        <i data-feather="play" class="me-1"></i>
                                        再生
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="downloadVideo('${format.url}', '${video.title.replace(/'/g, "\\'")}', '${format.quality}')">
                                        <i data-feather="download" class="me-1"></i>
                                        ダウンロード
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">閉じる</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        feather.replace();
    }

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

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const query = queryInput.value.trim();
        
        if (!query) {
            showError('検索キーワードを入力してください');
            return;
        }

        showLoading();

        try {
            const response = await fetch('/wakame-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '検索中にエラーが発生しました');
            }

            if (data.success && data.results) {
                showResults(data.results);
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