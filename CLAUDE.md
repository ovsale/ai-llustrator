# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-llustrator is a TypeScript pipeline for creating illustrated videos from audio content. It processes audio files through a 6-step workflow to generate a complete video with AI-generated images and narration.

## Common Commands

### Build and Development
- `npm run build` - Compile TypeScript to dist/ directory
- `npm test` - Run Jest tests

### Pipeline Steps (Sequential Execution Required)
- `npm run 1_transcribe` - Transcribe audio using ElevenLabs
- `npm run 2_transcr2scenes` - Split transcript into scenes with timing
- `npm run 3_data_extract` - Extract summary, locations, cast, and style using OpenAI
- `npm run 4_prompts_generator` - Generate image prompts for each scene
- `npm run 5_images_generator` - Generate images using OpenAI DALL-E
- `npm run 6_video_generator` - Create final video with FFmpeg

## Architecture

### Core Workflow
The application follows a strict sequential pipeline where each step depends on outputs from previous steps:

1. **Audio Input**: Expects `audio.mp3` in project directory
2. **Transcription**: Creates `transcr.json` with word-level timestamps
3. **Scene Segmentation**: Groups sentences into scenes (5-18 seconds) with optimized timing
4. **Data Extraction**: Uses OpenAI to extract narrative elements (summary, locations, cast, style)
5. **Prompt Generation**: Creates image prompts using conversation history for consistency
6. **Image Generation**: Batch generates images with style consistency
7. **Video Assembly**: Creates video clips and merges with audio using FFmpeg

### Project Structure
- **src/app/**: Contains numbered pipeline scripts (1-6) and project configuration
- **book/[project]/**: Project-specific data directory containing all generated assets
- **project.ts**: Defines current project directory path

### Key Dependencies
- **OpenAI**: For GPT-4 text processing and DALL-E image generation
- **ElevenLabs**: For speech-to-text transcription
- **FFmpeg**: For video processing and audio synchronization
- **Zod**: For structured data extraction validation

### Data Flow
Each step creates specific output files that subsequent steps consume:
- `transcr.json` → `scenes_.json` → `_summary.txt`, `_locations.txt`, `_cast.txt`, `_style.txt`
- Text files → `prompts/scene_*.txt` → `image/scene_*.png` → `video/scene_*.mp4` → `output.mp4`

### Configuration
- Project directory is set in `src/app/project.ts`
- Environment variables required: OpenAI API key, ElevenLabs API key
- Scene timing parameters: min_duration=5s, max_duration=18s