import * as fs from 'fs';
import path from 'path';
import { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import ffmpeg from 'fluent-ffmpeg';
import { projectDir } from './project.js';

export interface Scene {
    numb?: number,
    text: string;
    start: number;
    end: number;
    start2?: number;
    duration?: number;
    startStr?: string;
    endStr?: string;
    start2Str?: string;
}

// const projectDir = './book2/god_names';
const audioFile = path.join(projectDir, 'audio.mp3');
const transcrFile = path.join(projectDir, 'transcr.json');
const scenesFile = path.join(projectDir, 'scenes.json');

const min_duration = 5;
const max_duration = 18;
const start2_k = 0.1;

main();

function main() {
    // Step 1: Read transcript and convert to sentences
    const inputJson = fs.readFileSync(transcrFile, 'utf-8');
    const inputData: ElevenLabs.SpeechToTextChunkResponseModel = JSON.parse(inputJson);

    const sentences = transcriptToSentences(inputData);

    // Step 2: Group sentences into scenes and save
    let scenes = groupSentences(sentences, max_duration, min_duration);

    scenes = scenes.map((scene, i) => ({
        numb: i + 1,
        ...scene,
    }))

    compDurations(scenes, audioFile, scenesFile)
}

// 1. Convert transcript words to sentences
function transcriptToSentences(inputData: ElevenLabs.SpeechToTextChunkResponseModel): Scene[] {
    const sentences: Scene[] = [];
    let buffer: string[] = [];
    let sentenceStart: number | null = null;
    let sentenceEnd: number | null = null;

    for (const word of inputData.words) {
        if (word.type === 'word') {
            if (sentenceStart === null) sentenceStart = word.start;
            buffer.push(word.text);
            sentenceEnd = word.end;

            if (isSentenceEnd(word)) {
                const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
                sentences.push({ text, start: sentenceStart, end: sentenceEnd });
                buffer = [];
                sentenceStart = null;
                sentenceEnd = null;
            }
        }
    }
    // Add any remaining words as a sentence
    if (buffer.length > 0 && sentenceStart !== null && sentenceEnd !== null) {
        const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
        sentences.push({ text, start: sentenceStart, end: sentenceEnd });
    }
    return sentences;
}

function isSentenceEnd(word: ElevenLabs.SpeechToTextWordResponseModel): boolean {
    return /[.?!]$/.test(word.text);
}

// 2. Group sentences into scenes by max duration
function groupSentences(
    sentences: Scene[],
    max_duration: number,
    min_duration: number
): Scene[] {
    if (sentences.length === 0) return [];

    const groups: Scene[] = [];
    let groupStart = sentences[0].start;
    let groupEnd = sentences[0].end;
    let groupText: string[] = [sentences[0].text];

    for (let i = 1; i < sentences.length; i++) {
        const sent = sentences[i];
        const tentativeEnd = sent.end;
        const groupDuration = tentativeEnd - groupStart;

        if (groupDuration < max_duration) {
            // Still within max_duration, keep adding
            groupEnd = sent.end;
            groupText.push(sent.text);
        } else {
            // Exceeds max_duration, but check if group so far is too short
            const currentGroupDuration = groupEnd - groupStart;
            if (currentGroupDuration < min_duration) {
                // Force-extend: Add current sentence even if over max_duration
                groupEnd = sent.end;
                groupText.push(sent.text);
            } else {
                // Finalize current group and start a new one
                groups.push({
                    text: groupText.join(' '),
                    start: groupStart,
                    end: groupEnd,
                });
                groupStart = sent.start;
                groupEnd = sent.end;
                groupText = [sent.text];
            }
        }
    }
    // Add final group
    groups.push({
        text: groupText.join(' '),
        start: groupStart,
        end: groupEnd,
    });

    return groups;
}

function compDurations(
    scenes: Scene[],
    audioFile: string,
    outFile: string
) {
    // 1. Prepare new array with start2
    const scenes2: Scene[] = scenes.map((scene, i) => {
        // Compute virtual start for each scene
        let start2 = scene.start + start2_k * (scene.end - scene.start);
        return { ...scene, start2 };
    });

    // 2. Set start2 of first scene to 0
    if (scenes2.length > 0) {
        scenes2[0].start2 = 0;
    }

    // 3. Get audio duration from mp3
    ffmpeg.ffprobe(audioFile, function (err, metadata) {
        if (err) {
            console.error('Error getting audio duration:', err);
            process.exit(1);
        }

        const audioDuration = metadata.format.duration;
        if (typeof audioDuration !== 'number') {
            console.error('Could not determine audio duration.');
            process.exit(1);
        }

        console.log(`audio duration: ${audioDuration.toFixed(1)} seconds`);

        // 4. Assign durations based on start2 fields
        for (let i = 0; i < scenes2.length; i++) {
            if (i < scenes2.length - 1) {
                scenes2[i].duration = scenes2[i + 1].start2! - scenes2[i].start2!;
            } else {
                scenes2[i].duration = audioDuration - scenes2[i].start2!;
            }
        }

        // 5. Stats & Write result
        console.log(`scenes: ${scenes.length}`);
        const durations = scenes2.map(scene => scene.duration ?? 0);
        const total = durations.reduce((a, b) => a + b, 0);
        const avg = durations.length > 0 ? total / durations.length : 0;
        console.log(`total duration: ${total.toFixed(1)} seconds (should match audio length)`);
        console.log(`average duration: ${avg.toFixed(1)} seconds`);

        for (let i = 0; i < scenes2.length; i++) {
            scenes2[i].startStr = secToStr(scenes2[i].start);
            scenes2[i].endStr = secToStr(scenes2[i].end);
            scenes2[i].start2Str = secToStr(scenes2[i].start2!);
        }

        fs.writeFileSync(outFile, JSON.stringify(scenes2, null, 2));
        console.log(`scenes2 saved to ${outFile}`);
    });
}

function secToStr(sec: number): string {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.round(sec - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

  
