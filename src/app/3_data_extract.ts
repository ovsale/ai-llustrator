import * as fs from 'fs';
import path from 'path';
import { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { projectDir } from './project.js';

const transcrFile = path.join(projectDir, 'transcr.json');
const summaryFile = path.join(projectDir, '_summary.txt');
const locationsFile = path.join(projectDir, '_locations.txt');
const castFile = path.join(projectDir, '_cast.txt');
const styleFile = path.join(projectDir, '_style.txt');

const sysPrompt = `
Ты — ассистент, который структурирует информацию для иллюстрированной презентации. 
Из текста создай:

1. summary — Подробный саммари рассказа.
2. locations - Cписок локаций с описаниями.
   Формат:
   [название локации] - [описание локации с указаниями цветов обьектов] 
3. cast — Список главных героев с наиболее подходящим актером-прототипом и его одежды в разных локациях.
   Формат:
   Имя — внешне похож на [актера], возраст [... лет]
    [название локации] - одет в [описание с указанием цветов].
    [название локации 2] - ...
4. style — Краткое описание наиболее подходящего художественного стиля для иллюстраций (10 слов, обязательно упомяни технику).
`;

/*
 Каждая на новой строке.
*/

dotenv.config();
const openai = new OpenAI();

// --- Zod schema matching your interface
const TextDataSchema = z.object({
    summary: z.string(),
    locations: z.string(),
    cast: z.string(),
    style: z.string(),
  });
export type TextData = z.infer<typeof TextDataSchema>;

await main();

async function main() {
    const inputJson = fs.readFileSync(transcrFile, 'utf-8');
    const inputData: ElevenLabs.SpeechToTextChunkResponseModel = JSON.parse(inputJson);

    const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4.1",
        messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: inputData.text }
        ],
        response_format: zodResponseFormat(TextDataSchema, "text_data"),
    });

    const data: TextData = completion.choices[0].message.parsed;

    console.log('--- summary ---\n', data.summary);
    console.log('--- locations ---\n', data.locations);
    console.log('--- cast ---\n', data.cast);
    console.log('--- style ---\n', data.style);

    fs.writeFileSync(summaryFile, data.summary, "utf8");
    fs.writeFileSync(locationsFile, data.locations, "utf8");
    fs.writeFileSync(castFile, data.cast, "utf8");
    fs.writeFileSync(styleFile, data.style, "utf8");
}
