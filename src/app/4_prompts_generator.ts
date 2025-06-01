import fs from "fs";
import path from 'path';
import OpenAI from "openai";
import dotenv from "dotenv";
import { Scene } from "./2_transcr2scenes.js";
import { TextData } from "./3_data_extract.js";
import { projectDir } from "./project.js";

dotenv.config();
const openai = new OpenAI();

// const openai = new OpenAI({
//     baseURL: 'https://api.deepseek.com',
//     apiKey: process.env.DS_API_KEY,
//     timeout: 300 * 1000,
// })

function getSystemPrompt(summary: string, locations: string, cast: string): string {
    return `
Твоя задача — создавать промпты для генерации иллюстраций к следующему рассказу.

Краткое содержание:
${summary}

Локации:
${locations}

Действующие лица:
${cast}

Напиши один промпт на русском языке для иллюстрации сцены <current_scene/>. Используй содержание <future_scenes/> для прогнозирования будущих сцен.

В каждом промпте для иллюстрации сцены должно быть указано:
- начни с плана и ракурса сцены. используй общий, дальний, средний, крупный, экстремальный крупный, план-деталь и другие, чтобы сделать серию иллюстраций более выразительной и динамичной. используй смену планов и ракурсов чаще во время однообразных фрагментов. учти что средний и крупный часто отображаются одинаково.
- локация где происходит сцена должна быть описана (см. Локации)
- все участники сцены должны быть описаны: для каждого укажи актера прототипа, возраст, во что одет (см. Действующие лица)

Не давай объяснений и не добавляй лишний текст.
`
}

/*
В каждом промпте для иллюстрации сцены должно быть описано:
- план и ракурс сцены. используй общий, дальний, средний, крупный, экстремальный крупный, план-деталь и другие, чтобы сделать серию иллюстраций более выразительной и динамичной. используй смену планов и ракурсов чаще во время однообразных фрагментов. учти что средний и крупный часто отображаются одинаково.
*/

/*
Напиши один промпт на русском языке для иллюстрации сцены <current_scene/>. Используй содержание <future_scenes/> для прогнозирования будущих сцен.
*/

/*
В каждом промпте должно быть перечислено по пунктам:
- описание локации где происходит сцена (см. Локации)
- перечисли участников сцены: для каждого укажи актера прототипа, возраст, во что одет (см. Действующие лица)
- описание сцены. начни с названия плана для сцены. используй общий, дальний, средний, крупный, экстремальный крупный, план-деталь и другие, чтобы сделать серию иллюстраций более выразительной и динамичной.
*/

/*
В промпте сначала опиши место, где происходит событие, затем опиши, что происходит в сцене — участников и их действия.
*/

function getUserPrompt2(currentScene: string, futureScenes: string): string {
    return `
Напиши промпт для иллюстрации сцены <current_scene/>:

<current_scene>
${currentScene}
</current_scene>

<future_scenes>
${futureScenes}
</future_scenes>
`
}

const scenesFile = path.join(projectDir, 'scenes_.json');
const promptsDir = path.join(projectDir, 'prompts');
const summaryFile = path.join(projectDir, '_summary_.txt');
const locationsFile = path.join(projectDir, '_locations_.txt');
const castFile = path.join(projectDir, '_cast_.txt');

const pastPromptsCnt = 6

const inputJson = fs.readFileSync(scenesFile, 'utf-8')
const scenes_: Scene[] = JSON.parse(inputJson)
let scenes = scenes_.map(scene => scene.text)

const textData: TextData = {
    summary: fs.readFileSync(summaryFile, 'utf-8'),
    locations: fs.readFileSync(locationsFile, 'utf-8'),
    cast: fs.readFileSync(castFile, 'utf-8'),
}

if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
}

await main()

async function main() {
    let messageHistory: OpenAI.ChatCompletionMessageParam[] = []
    let sysPrompt = getSystemPrompt(textData.summary, textData.locations, textData.cast)
    console.log('-----------')
    console.log(sysPrompt)
    console.log('-----------')
    let systemMessage = {
        role: "system",
        content: sysPrompt,
    } as OpenAI.ChatCompletionMessageParam

    // const prompts: string[] = [];

    let to = scenes.length
    // to = 60
    for (let idx = 0; idx < to; idx++) {
        const userPrompt = buildUserPrompt(idx);
        // console.log('-----------')
        // console.log(userPrompt)
        // console.log('-----------')

        messageHistory.push({
            role: "user",
            content: userPrompt
        })

        const promptFile = path.join(promptsDir, `scene_${idx + 1}.txt`);
        let prompt = '';
        if (fs.existsSync(promptFile)) {
            prompt = fs.readFileSync(promptFile, 'utf-8')
        } else {
            const response = await openai.chat.completions.create({
                model: "gpt-4.1",
                // model: 'deepseek-reasoner',
                messages: [
                    systemMessage,
                    ...messageHistory
                ]
            })
            prompt = response.choices[0].message.content?.trim()
            fs.writeFileSync(promptFile, prompt, 'utf-8');

            console.log(`\nscene_${idx + 1}:\n${prompt}\n`);
        }

        // prompts.push(prompt);

        messageHistory.push({
            role: "assistant",
            content: prompt
        })

        if (messageHistory.length > pastPromptsCnt * 2) {
            messageHistory = messageHistory.slice(2)
        }
        // console.log(`messageHistory.length: ${messageHistory.length}`)
    }

    console.log(`All prompts saved to ${promptsDir}`);
}

function buildUserPrompt(currentIdx: number): string {
    const currentScene = scenes[currentIdx]
    const futureScenes = getFutureScenes(currentIdx)
    const futureScenesStr = futureScenes.map(s => `${s}`).join('\n')
    return getUserPrompt2(currentScene, futureScenesStr)
}

function getFutureScenes(idx: number): string[] {
    return scenes.slice(idx + 1, idx + 4)
}

