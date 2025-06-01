import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto'
import { Scene } from './2_transcr2scenes.js';
import { projectDir } from './project.js';

const imagesDir = path.join(projectDir, 'image');
const videosDir = path.join(projectDir, 'video');
const scenesFile = path.join(projectDir, 'scenes_.json');
const audioFile = path.join(projectDir, 'audio.mp3');
const renderInfoFile = path.join(projectDir, 'video.json');
const concatTxt = path.join(videosDir, 'input.txt');
const outputFile = path.join(projectDir, 'output.mp4');

if (!fs.existsSync(videosDir)){
    fs.mkdirSync(videosDir);
}

let scenes: Scene[] = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));
let durations: number[] = scenes.map(scene => scene.duration);

let lastSceneWithImage = -1;
for (let i = 0; i < scenes.length; ++i) {
    const imgPath = path.join(imagesDir, `scene_${i + 1}.png`);
    if (fs.existsSync(imgPath)) {
        lastSceneWithImage = i;
    } else {
        break; // Stop at the first missing image
    }
}

scenes = scenes.slice(0, lastSceneWithImage + 1);
durations = durations.slice(0, lastSceneWithImage + 1);

const totalDuration = durations.reduce((sum, d) => sum + d, 0);
console.log(`total duration: ${totalDuration}`);

function makeImageClip1(imgPath: string, vidPath: string, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imgPath)
            .loop(duration)
            .outputOptions([
                '-vf', 'fps=30',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-t', duration.toString()
            ])
            .output(vidPath)
            .on('end', () => resolve())
            .on('error', err => reject(err))
            .run();
    });
}

async function createAllClips() {
    let renderInfo = loadRenderInfo();

    for (let i = 0; i < durations.length; ++i) {
        const imgPath = path.join(imagesDir, `scene_${i + 1}.png`);
        const vidPath = path.join(videosDir, `scene_${i + 1}.mp4`);
        const key = `scene_${i + 1}`;
        let shouldRender = true;

        if (!fs.existsSync(imgPath)) {
            console.warn(`Image file missing: ${imgPath}, skipping.`);
            continue;
        }

        const currentHash = hashFileSync(imgPath);
        const previousHash = renderInfo[key];

        if (fs.existsSync(vidPath) && previousHash === currentHash) {
            console.log(`Clip up-to-date (hash matched): ${key}.mp4 (skipping)`);
            shouldRender = false;
        } else {
            console.log(`New image or image changed: ${key}. Rendering video...`);
        }

        if (shouldRender) {
            console.log(`Rendering video clip for ${key}`);
            await makeImageClip1(imgPath, vidPath, durations[i]);
            // Update the hash info after render
            renderInfo[key] = currentHash;
            saveRenderInfo(renderInfo);
        }
    }
}

function loadRenderInfo(): Record<string, string> {
    if (fs.existsSync(renderInfoFile)) {
        return JSON.parse(fs.readFileSync(renderInfoFile, 'utf8'));
    }
    return {};
}

function saveRenderInfo(renderInfo: Record<string, string>) {
    fs.writeFileSync(renderInfoFile, JSON.stringify(renderInfo, null, 2));
}

function hashFileSync(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function writeConcatList() {
    let txt = '';
    for (let i = 0; i < durations.length; ++i) {
        txt += `file 'scene_${i + 1}.mp4'\n`;
    }
    fs.writeFileSync(concatTxt, txt);
}

function concatVideos() {
    return new Promise((resolve, reject) => {
        console.log('combining video...')
        const tempVideo = path.join(projectDir, 'temp_slideshow.mp4');
        ffmpeg()
            .input(concatTxt)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions([
                '-c', 'copy',
                '-movflags', '+faststart'
            ])
            .output(tempVideo)
            .on('end', () => resolve(tempVideo))
            .on('error', err => reject(err))
            .run();
    });
}

function addAudio(tempVideo) {
    console.log('merging with audio...')
    ffmpeg()
        .input(tempVideo)
        .input(audioFile)
        .outputOptions([
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
            '-t', totalDuration.toString(),
        ])
        .output(outputFile)
        .on('end', () => {
            console.log('✅  Done →', outputFile);
            fs.unlinkSync(concatTxt);
            fs.unlinkSync(tempVideo);
        })
        .on('error', e => console.error('Mux error:', e.message))
        .run();
}

(async function main() {
    await createAllClips();
    writeConcatList();
    const tempVideo = await concatVideos();
    addAudio(tempVideo);
})();
