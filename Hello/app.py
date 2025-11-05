import os
import logging
import subprocess
import json
import re
import time
import requests
from urllib.parse import urlparse, parse_qs, quote
from flask import Flask, render_template, request, jsonify

# Set up logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

def is_valid_youtube_url(url):
    """Validate if the URL is a valid YouTube URL"""
    if not url:
        return False
    
    # Basic URL validation
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
    except:
        return False
    
    # YouTube URL patterns
    youtube_patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'(?:https?://)?(?:www\.)?youtu\.be/[\w-]+',
        r'(?:https?://)?(?:www\.)?youtube\.com/embed/[\w-]+',
        r'(?:https?://)?(?:m\.)?youtube\.com/watch\?v=[\w-]+'
    ]
    
    return any(re.match(pattern, url) for pattern in youtube_patterns)

def extract_video_info(url):
    """Extract video information and available formats using yt-dlp"""
    try:
        # Updated command with better error handling
        cmd = [
            'yt-dlp',
            '--dump-json',
            '--no-warnings',
            '--no-playlist',
            '--skip-download',
            url
        ]
        
        logging.debug(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        logging.debug(f"Return code: {result.returncode}")
        logging.debug(f"Stdout: {result.stdout[:500]}...")
        logging.debug(f"Stderr: {result.stderr}")
        
        if result.returncode != 0:
            error_msg = result.stderr.strip()
            if not error_msg:
                error_msg = "Unknown error occurred"
            logging.error(f"yt-dlp error: {error_msg}")
            return None, f"Failed to fetch video: {error_msg}"
        
        if not result.stdout.strip():
            return None, "No video information returned by yt-dlp"
        
        try:
            # Parse the JSON output
            lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
            if not lines:
                return None, "Empty output from yt-dlp"
                
            video_info = json.loads(lines[0])
            logging.debug(f"Successfully parsed video info: {video_info.get('title', 'Unknown')}")
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {e}")
            logging.error(f"Raw output: {result.stdout[:200]}...")
            return None, f"Failed to parse video information: {str(e)}"
        
        # Extract available formats with better handling
        formats = video_info.get('formats', [])
        mp4_formats = []
        
        logging.debug(f"Found {len(formats)} total formats")
        
        for fmt in formats:
            ext = fmt.get('ext')
            vcodec = fmt.get('vcodec')
            acodec = fmt.get('acodec')
            url = fmt.get('url')
            
            logging.debug(f"Format: {fmt.get('format_id')} - ext: {ext}, vcodec: {vcodec}, acodec: {acodec}, url: {'yes' if url else 'no'}")
            
            # Look for MP4 formats with both video and audio
            if (ext == 'mp4' and 
                vcodec and vcodec != 'none' and 
                acodec and acodec != 'none' and
                url):
                
                quality = fmt.get('height', 0)
                filesize = fmt.get('filesize')
                
                mp4_formats.append({
                    'format_id': fmt.get('format_id'),
                    'quality': f"{quality}p" if quality else "Unknown",
                    'url': url,
                    'filesize': filesize,
                    'fps': fmt.get('fps'),
                    'height': quality
                })
        
        # If no combined MP4 formats found, look for the best available formats
        if not mp4_formats:
            logging.debug("No combined MP4 formats found, looking for alternatives...")
            
            # Try to find formats that can be played in browser
            for fmt in formats:
                ext = fmt.get('ext')
                url = fmt.get('url')
                format_id = fmt.get('format_id', '')
                
                # Look for web-compatible formats
                if (url and ext in ['mp4', 'webm'] and 
                    ('dash' not in format_id.lower() or fmt.get('vcodec') != 'none')):
                    
                    quality = fmt.get('height', 0)
                    filesize = fmt.get('filesize')
                    
                    mp4_formats.append({
                        'format_id': fmt.get('format_id'),
                        'quality': f"{quality}p ({ext})" if quality else f"Unknown ({ext})",
                        'url': url,
                        'filesize': filesize,
                        'fps': fmt.get('fps'),
                        'height': quality
                    })
        
        # Sort by quality (height) descending
        mp4_formats.sort(key=lambda x: x['height'] or 0, reverse=True)
        
        # Remove duplicates based on quality and format
        seen = set()
        unique_formats = []
        for fmt in mp4_formats:
            key = (fmt['height'], fmt['quality'])
            if key not in seen:
                seen.add(key)
                unique_formats.append(fmt)
        
        mp4_formats = unique_formats
        
        if not mp4_formats:
            logging.debug("No compatible formats found")
            return None, "この動画には対応可能な形式が見つかりませんでした"
        
        logging.debug(f"Found {len(mp4_formats)} compatible formats")
        
        video_data = {
            'title': video_info.get('title', 'Unknown Title'),
            'duration': video_info.get('duration'),
            'uploader': video_info.get('uploader', 'Unknown'),
            'thumbnail': video_info.get('thumbnail'),
            'formats': mp4_formats
        }
        
        return video_data, None
        
    except subprocess.TimeoutExpired:
        return None, "Request timeout - video processing took too long"
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return None, f"Unexpected error: {str(e)}"

@app.route('/')
def home():
    """Home page with tool selection"""
    return render_template('home.html')

@app.route('/video-extractor')
def video_extractor():
    """Video URL extractor page"""
    return render_template('index.html')

@app.route('/search')
def search_page():
    """Search and play page"""
    return render_template('search.html')

@app.route('/auto-download')
def auto_download_page():
    """Auto download page"""
    return render_template('auto_download.html')

@app.route('/extract', methods=['POST'])
def extract_video():
    """Extract video information and formats"""
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'error': 'URL is required'}), 400
    
    url = data['url'].strip()
    
    if not url:
        return jsonify({'error': 'URL cannot be empty'}), 400
    
    if not is_valid_youtube_url(url):
        return jsonify({'error': 'Please enter a valid YouTube URL'}), 400
    
    video_info, error = extract_video_info(url)
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({
        'success': True,
        'video': video_info
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

def get_working_invidious_instances():
    """Get list of working Invidious instances, prioritizing yewtudotbe custom instances"""
    # Prioritize yewtudotbe/invidious-custom instances first
    priority_instances = [
        'yewtu.be',  # Main yewtudotbe instance
        'invidious.fdn.fr',  # Another stable custom instance
        'invidious.snopyta.org'
    ]
    
    # Test priority instances first
    working_priority = []
    for instance in priority_instances:
        try:
            test_url = f"https://{instance}/api/v1/stats"
            response = requests.get(test_url, timeout=5)
            if response.status_code == 200:
                working_priority.append(instance)
                logging.debug(f"Priority instance {instance} is working")
        except:
            logging.debug(f"Priority instance {instance} failed health check")
            continue
    
    # Try official API for additional instances
    additional_instances = []
    try:
        response = requests.get('https://api.invidious.io/', timeout=8)
        if response.status_code == 200:
            instances = response.json()
            for instance in instances:
                if (instance.get('api', False) and 
                    instance.get('type') == 'https' and
                    instance.get('monitor', {}).get('statusClass') == 'up'):
                    domain = instance.get('uri', '').replace('https://', '')
                    if domain not in priority_instances:
                        additional_instances.append(domain)
            additional_instances = additional_instances[:5]  # Limit additional instances
    except:
        # Fallback instances if API fails
        additional_instances = [
            'yt.artemislena.eu',
            'invidious.projectsegfau.lt',
            'invidious.flokinet.to',
            'iv.melmac.space'
        ]
    
    # Return priority instances first, then additional ones
    return working_priority + additional_instances

def search_with_yt_dlp(query):
    """Fallback search using yt-dlp directly"""
    try:
        # Search using yt-dlp
        search_query = f"ytsearch12:{query}"
        cmd = [
            'yt-dlp',
            '--dump-json',
            '--no-warnings',
            '--skip-download',
            '--flat-playlist',
            search_query
        ]
        
        logging.debug(f"Searching with yt-dlp: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            logging.error(f"yt-dlp search error: {result.stderr}")
            return None
        
        if not result.stdout.strip():
            return None
        
        # Parse JSON results
        results = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                try:
                    video = json.loads(line)
                    results.append({
                        'videoId': video.get('id'),
                        'title': video.get('title'),
                        'author': video.get('uploader', 'Unknown'),
                        'lengthSeconds': video.get('duration'),
                        'viewCount': video.get('view_count'),
                        'publishedText': 'Unknown',
                        'description': video.get('description', '')[:200] if video.get('description') else '',
                        'videoThumbnails': [{'url': video.get('thumbnail')}] if video.get('thumbnail') else []
                    })
                except json.JSONDecodeError:
                    continue
        
        return results
        
    except Exception as e:
        logging.error(f"yt-dlp search failed: {str(e)}")
        return None

@app.route('/search-videos', methods=['POST'])
def search_videos():
    """Search videos using yt-dlp primarily with Invidious fallback"""
    data = request.get_json()
    
    if not data or 'query' not in data:
        return jsonify({'error': '検索クエリが必要です'}), 400
    
    query = data['query'].strip()
    primary_instance = data.get('instance', 'auto')
    
    if not query:
        return jsonify({'error': '検索クエリが空です'}), 400
    
    # Try yt-dlp first as it's most reliable
    logging.info("Trying yt-dlp direct search first")
    ytdlp_results = search_with_yt_dlp(query)
    
    if ytdlp_results:
        logging.debug(f"yt-dlp found {len(ytdlp_results)} results")
        return jsonify({
            'success': True,
            'results': ytdlp_results,
            'instance': 'yt-dlp-direct',
            'method': 'yt-dlp',
            'used_fallback': False
        })
    
    # If yt-dlp fails, try Invidious as fallback
    logging.info("yt-dlp failed, trying Invidious instances")
    
    # Get working instances dynamically
    working_instances = get_working_invidious_instances()
    
    # If user selected a specific instance, try it first
    if primary_instance and primary_instance != 'auto':
        instances_to_try = [primary_instance] + [i for i in working_instances if i != primary_instance]
    else:
        instances_to_try = working_instances
    
    logging.debug(f"Trying {len(instances_to_try)} Invidious instances: {instances_to_try}")
    
    last_error = None
    
    # Try Invidious instances with rate limiting protection
    for i, instance in enumerate(instances_to_try):
        # Add delay between requests to avoid rate limiting
        if i > 0:
            time.sleep(2)
            
        try:
            search_url = f"https://{instance}/api/v1/search"
            params = {
                'q': query,
                'type': 'video',
                'sort_by': 'relevance',
                'page': 1
            }
            
            logging.debug(f"Trying instance: {instance}")
            
            # Use headers that work better with yewtudotbe/invidious-custom
            headers = {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Referer': f'https://{instance}/'
            }
            
            response = requests.get(search_url, params=params, timeout=20, headers=headers)
            
            if response.status_code == 200:
                try:
                    results = response.json()
                    
                    if not results:
                        continue
                    
                    # Filter and format results
                    video_results = []
                    for video in results[:12]:
                        if video.get('type') == 'video' and video.get('videoId'):
                            video_results.append({
                                'videoId': video.get('videoId'),
                                'title': video.get('title'),
                                'author': video.get('author'),
                                'lengthSeconds': video.get('lengthSeconds'),
                                'viewCount': video.get('viewCount'),
                                'publishedText': video.get('publishedText'),
                                'description': video.get('description', '')[:200] if video.get('description') else '',
                                'videoThumbnails': video.get('videoThumbnails', [])
                            })
                    
                    if video_results:
                        logging.debug(f"Found {len(video_results)} results from {instance}")
                        return jsonify({
                            'success': True,
                            'results': video_results,
                            'instance': instance,
                            'method': 'invidious',
                            'used_fallback': instance != primary_instance
                        })
                        
                except json.JSONDecodeError as e:
                    logging.warning(f"JSON decode error from {instance}: {e}")
                    continue
                    
            else:
                logging.warning(f"HTTP {response.status_code} from {instance}")
                last_error = f"HTTP {response.status_code}"
                continue
                
        except requests.exceptions.Timeout:
            logging.warning(f"Timeout: {instance}")
            continue
        except Exception as e:
            logging.warning(f"Error with {instance}: {str(e)}")
            continue
    
    # Complete failure - both yt-dlp and Invidious failed
    return jsonify({
        'error': 'すべての検索方法で失敗しました。ネットワーク接続を確認して再試行してください。'
    }), 500

@app.route('/test-ytdlp')
def test_ytdlp():
    """Test yt-dlp functionality with a simple video"""
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    try:
        cmd = ['yt-dlp', '--dump-json', '--no-playlist', '--skip-download', test_url]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        return jsonify({
            'command': ' '.join(cmd),
            'return_code': result.returncode,
            'stdout_length': len(result.stdout),
            'stderr': result.stderr,
            'stdout_preview': result.stdout[:500] if result.stdout else "Empty",
            'has_output': bool(result.stdout.strip())
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': type(e).__name__
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
