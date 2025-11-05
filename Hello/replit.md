# Hirateta-tube

## Overview

This is a Flask-based web application called "Hirateta-tube" that provides YouTube video search, direct playback, and automatic download functionality. The primary features include YouTube MP4 extractor with direct download capabilities, search functionality using yewtudotbe/invidious-custom API, and an integrated wakame tube feature that replicates wakame02/wkt functionality. The application uses yt-dlp to fetch video information and available formats, presenting them in a user-friendly interface with both playback and download options. Users can access "URLから再生" (Play from URL) to input YouTube URLs directly, "検索して再生" (Search and Play) to search for videos via Invidious API, "自動ダウンロード" (Auto Download) for highest quality automatic downloads, and "わかめtube" (Wakame Tube) to search YouTube videos with yt-dlp and extract/download them directly within the site.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Flask for server-side rendering
- **UI Framework**: Bootstrap 5 with dark theme for responsive design
- **Icons**: Feather Icons for consistent iconography
- **JavaScript**: Vanilla JavaScript for client-side interactions and form handling
- **Styling**: Custom CSS with smooth transitions and hover effects

### Backend Architecture
- **Web Framework**: Flask (lightweight Python web framework)
- **Video Processing**: yt-dlp integration for YouTube video information extraction
- **URL Validation**: Custom regex-based YouTube URL validation
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Logging**: Python logging module for debugging and monitoring

### Application Structure
- **Multi-page Application**: Home page with tool selection, dedicated extractor page, search page, auto-download page, and wakame tube integration page
- **RESTful Endpoints**: JSON API endpoints for video extraction
- **Stateless Design**: No database dependencies, all processing done on-demand
- **Security**: Session secret key for Flask security features
- **Tool-based Interface**: Expandable homepage design with multiple video tools
- **Wakame Tube Integration**: Full YouTube search and extraction functionality inspired by wakame02/wkt

### Data Flow
#### URL Extraction Flow
1. User starts on homepage and selects "URLから再生" tool
2. User submits YouTube URL via web form on dedicated extractor page
3. Backend validates URL format against YouTube patterns
4. yt-dlp subprocess extracts video metadata and available formats
5. Processed data returned as JSON to frontend
6. Frontend dynamically renders video information and download options
7. User can return to homepage via navigation button

#### Search and Extract Flow
1. User selects "検索して再生" from homepage
2. User enters search keywords and selects Invidious instance
3. Backend searches using yt-dlp (primary) or Invidious API (fallback)
4. Search results displayed with video metadata and thumbnails
5. User clicks "MP4取得・再生" on desired video
6. Backend extracts MP4 formats using yt-dlp from YouTube URL
7. Modal displays available video quality options
8. User selects quality and video opens in new tab for playback

## External Dependencies

### Core Dependencies
- **Flask**: Web framework for Python backend
- **yt-dlp**: Command-line tool for YouTube video downloading and metadata extraction

### Frontend Dependencies (CDN)
- **Bootstrap 5**: CSS framework with dark theme variant
- **Feather Icons**: Icon library for UI elements

### System Dependencies
- **Python**: Runtime environment
- **yt-dlp**: Must be installed as system command-line tool

### Environment Variables
- **SESSION_SECRET**: Flask session security key (defaults to dev key)

The application is designed to be lightweight and self-contained, with minimal external dependencies and no database requirements.