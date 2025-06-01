import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import { projectDir } from "./project.js";

dotenv.config();
const openai = new OpenAI();

const promptsDir = path.join(projectDir, 'prompts');
const styleFile = path.join(projectDir, '_style_.txt');
const outputDir = path.join(projectDir, 'image');

await main();

async function main() {
    const prompts: string[] = [];
    for (let i = 0; ; i++) {
        const fname = path.join(promptsDir, `scene_${i + 1}.txt`);
        if (!fs.existsSync(fname)) break;
        const content = fs.readFileSync(fname, "utf-8").trim();
        prompts.push(content);
    }
    console.log(`Loaded ${prompts.length} prompts from folder.`);

    let styleStr = fs.readFileSync(styleFile, 'utf-8')

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let stylePrompt = `
Стиль: ${styleStr}
`
    const batchSize = 10

    let from = 0
    let to = prompts.length;

    // from = 70
    // to = 80

    const tasks: (() => Promise<void>)[] = [];
    for (let idx = from; idx < to; idx++) {
        const filename = path.join(outputDir, `scene_${idx + 1}.png`);
        if (fs.existsSync(filename)) {
            // console.log(`Image already exists: ${filename}, skipping.`);
            continue;
        }
        let prompt = prompts[idx];
        prompt += stylePrompt;
        tasks.push(() => generateImage(prompt, filename));
    }

    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize).map(task => task());
        await Promise.all(batch);
        console.log(`Batch ${Math.floor(i / batchSize) + 1} of images generated.`);
    }

    console.log("All images generated.");
}

async function generateImage(prompt: string, filename: string) {
    // let quality = filename.endsWith('_1.png') ? "high" : "medium"
    let quality = "medium"
    // quality = "high"
    // quality = "low"
    console.log(`Generating: ${filename}, quality: ${quality}`);
    try {
        const result = await openai.images.generate({
            model: "gpt-image-1",
            prompt: prompt,
            quality: quality as any,
            // size: "1024x1024",
            size: "1536x1024",
        });
        const image_base64 = result.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, "base64");
        fs.writeFileSync(filename, image_bytes);
        console.log(`Saved image: ${filename}`);
    } catch (e) {
        console.error(`Image generation failed for file ${filename}:`, e.message);
    }
}

