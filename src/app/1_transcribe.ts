import fs from "fs";
import path from "path";
import dotenv from 'dotenv'

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { projectDir } from "./project.js";

dotenv.config()

const elevenlabs = new ElevenLabsClient();

// const projectDir = './book2/god_names';
const inPath = path.join(projectDir, 'audio.mp3');
const outPath = path.join(projectDir, 'transcr.json');

await main()

async function main() {
    if (fs.existsSync(outPath)) {
        return
    }
    
    const audioBuffer = fs.readFileSync(inPath);
    
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
    
    const transcription = await elevenlabs.speechToText.convert({
        file: audioBlob,
        modelId: "scribe_v1", 
        // tagAudioEvents: true,
        // languageCode: "eng",
        // diarize: true,
    });
    
    console.log(transcription);
    
    fs.writeFileSync(outPath, JSON.stringify(transcription, null, 2), "utf8");
    
    console.log(`Transcription saved to ${outPath}`);
}

