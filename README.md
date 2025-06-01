# AI-llustrator

Transform audio stories into illustrated videos using AI. This tool processes audio files through a complete pipeline to generate synchronized videos with AI-generated illustrations.

## Overview

AI-llustrator takes an audio file (like an audiobook or story) and creates an illustrated video by:
- Transcribing the audio with precise timing
- Breaking it into scenes
- Extracting narrative elements (characters, locations, style)
- Generating contextual image prompts
- Creating AI illustrations
- Assembling everything into a final video

## Prerequisites

- Node.js 18+
- FFmpeg installed on your system
- OpenAI API key
- ElevenLabs API key

## Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-llustrator
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

3. **Prepare your project:**
   - Create a new directory in `book/` for your project (e.g., `book/my-story`)
   - Place your audio file as `audio.mp3` in this directory
   - Update `src/app/project.ts` to point to your project directory:
     ```typescript
     export const projectDir = './book/my-story'
     ```

## Usage

Run the pipeline steps in order. Each step must complete successfully before proceeding to the next:

### Step 1: Transcribe Audio
```bash
npm run 1_transcribe
```
- Converts `audio.mp3` to text with word-level timestamps
- Creates `transcr.json`

### Step 2: Create Scenes
```bash
npm run 2_transcr2scenes
```
- Segments transcript into scenes (5-18 seconds each)
- Optimizes timing for visual storytelling
- Creates `scenes_.json`

### Step 3: Extract Story Elements
```bash
npm run 3_data_extract
```
- Uses AI to analyze the story and extract:
  - Summary
  - Locations with descriptions
  - Characters with actor prototypes and clothing
  - Artistic style recommendations
- Creates `_summary.txt`, `_locations.txt`, `_cast.txt`, `_style.txt`

### Step 4: Generate Image Prompts
```bash
npm run 4_prompts_generator
```
- Creates detailed prompts for each scene
- Uses conversation history for consistency
- Varies camera angles and compositions
- Creates `prompts/scene_*.txt` files

### Step 5: Generate Images
```bash
npm run 5_images_generator
```
- Generates AI illustrations using OpenAI DALL-E
- Processes in batches for efficiency
- Creates `image/scene_*.png` files

### Step 6: Create Video
```bash
npm run 6_video_generator
```
- Converts images to video clips with proper timing
- Merges with original audio
- Creates final `output.mp4`

## Output Structure

After running the complete pipeline, your project directory will contain:

```
book/my-story/
├── audio.mp3              # Original audio file
├── transcr.json           # Transcription with timestamps
├── scenes_.json           # Scene breakdown with timing
├── _summary.txt           # Story summary
├── _locations.txt         # Location descriptions
├── _cast.txt             # Character descriptions
├── _style.txt            # Artistic style guide
├── prompts/              # Generated image prompts
│   ├── scene_1.txt
│   ├── scene_2.txt
│   └── ...
├── image/                # Generated illustrations
│   ├── scene_1.png
│   ├── scene_2.png
│   └── ...
├── video/                # Individual scene videos
│   ├── scene_1.mp4
│   ├── scene_2.mp4
│   └── ...
└── output.mp4            # Final illustrated video
```

## Tips

- **Audio Quality**: Use clear, well-recorded audio for best transcription results
- **Scene Length**: The pipeline optimizes for 5-18 second scenes for visual pacing
- **Resumable**: Each step checks for existing output files and skips if already generated
- **Batch Processing**: Image generation processes in batches of 10 for efficiency
- **Memory Management**: The prompt generator maintains conversation history for consistency

## Troubleshooting

- **Transcription fails**: Check ElevenLabs API key and audio file format
- **Image generation fails**: Verify OpenAI API key and check rate limits
- **Video assembly fails**: Ensure FFmpeg is installed and accessible
- **Out of order execution**: Steps must be run sequentially as each depends on previous outputs

## Cost Considerations

- **ElevenLabs**: ~$0.30 per hour of audio for transcription
- **OpenAI**: 
  - Text processing: ~$0.10-0.50 per story depending on length
  - Image generation: $0.04-0.06 per image (gpt-image-1, depends on resolution)

A typical 30-minute story might cost $2-5 total to process.