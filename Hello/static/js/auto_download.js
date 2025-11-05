document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('autoDownloadForm');
    const urlInput = document.getElementById('youtubeUrl');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const successState = document.getElementById('successState');
    const errorMessage = document.getElementById('errorMessage');
    const videoTitle = document.getElementById('videoTitle');
    const videoInfo = document.getElementById('videoInfo');

    function hideAllStates() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        successState.style.display = 'none';
    }

    function showLoading() {
        hideAllStates();
        loadingState.style.display = 'block';
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i data-feather="loader" class="me-2"></i>処理中...';
        feather.replace();
    }

    function showError(message) {
        hideAllStates();
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i data-feather="download" class="me-2"></i>自動ダウンロード開始';
        feather.replace();
    }

    function showSuccess(title, info, downloadUrl, quality) {
        hideAllStates();
        videoTitle.textContent = title;
        videoInfo.textContent = info;
        successState.style.display = 'block';
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i data-feather="download" class="me-2"></i>自動ダウンロード開始';
        feather.replace();

        // Automatically start download
        startAutoDownload(downloadUrl, title, quality);
    }

    function startAutoDownload(url, title, quality) {
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
    }

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('YouTubeのURLを入力してください');
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
                throw new Error(data.error || 'エラーが発生しました');
            }

            if (data.success && data.video && data.video.formats && data.video.formats.length > 0) {
                // Find the best quality format (highest resolution)
                const bestFormat = data.video.formats.reduce((best, current) => {
                    const bestHeight = best.height || 0;
                    const currentHeight = current.height || 0;
                    return currentHeight > bestHeight ? current : best;
                });

                const duration = data.video.duration ? 
                    `再生時間: ${Math.floor(data.video.duration / 60)}:${(data.video.duration % 60).toString().padStart(2, '0')}` : '';
                const uploader = data.video.uploader ? `投稿者: ${data.video.uploader}` : '';
                const info = [uploader, duration, `画質: ${bestFormat.quality}`].filter(Boolean).join(' • ');

                showSuccess(data.video.title, info, bestFormat.url, bestFormat.quality);
            } else {
                showError('動画の取得に失敗しました');
            }

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || '予期しないエラーが発生しました');
        }
    });

    // Clear states when URL changes
    urlInput.addEventListener('input', function() {
        if (errorState.style.display !== 'none' || successState.style.display !== 'none') {
            hideAllStates();
        }
    });
});