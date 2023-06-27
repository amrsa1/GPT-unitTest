import { Configuration, OpenAIApi } from "openai";
import { encode } from 'gpt-3-encoder';

import * as fs from 'fs';
import { promisify } from 'util';
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
import { createWriteStream, createReadStream } from 'fs';

let output: string | any;

export class OpenAPI {
  private openai: OpenAIApi;

  private UNIT_TEST_REQUEST = (framework: string, path: string, code: string) => `Generate a unit tests with the ${framework} framework and syntax, containing relevant assertions and imports using TS. \nAdd this comments after you finish the task "//IM DONE". \nImport the functions from ${path} and use them to test the following code snippet: \n${code}`;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async readFileAsCode(filePath: string): Promise<string> {
    try {
      const data = await readFileAsync(filePath, 'utf8');
      return data;
    } catch (error) {
      throw new Error(`Error reading file: ${error}`);
    }
  }

  // async readFileAsCode(filePath: string): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     const readStream = createReadStream(filePath, 'utf8');
  //     let data = '';

  //     readStream.on('data', (chunk) => {
  //       data += chunk;
  //     });

  //     readStream.on('end', () => {
  //       resolve(data);
  //     });

  //     readStream.on('error', (error) => {
  //       reject(new Error(`Error reading file: ${error}`));
  //     });
  //   });
  // }
  async countTokens(str: string) {
    const encoded = encode(str);
    console.log(encoded.length)
    return encoded.length;
  }

  async generateUnitTest(framework: string, path: string, code: string, token: number): Promise<void> {
    const spinner = (await import('ora')).default('Please Wait Generating unit test...').start();
    try {
      await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{
          "role": "user",
          "content": this.UNIT_TEST_REQUEST(framework, path, code)
        }],
        stream: false,
        temperature: 0,
        // max_tokens: 2500
      }).then(async (res) => {
        const message = res.data.choices[0]?.message;
        console.log(res)
        output = message?.content;
      });
      spinner.succeed('Unit test generated');
    } catch (error) {
      spinner.fail(`Error generating unit test: ${error}`);
    }
  }

  // async createTestSuitFile(): Promise<void> {
  //   const fileName = './src/unitTestSuie.ts';
  //   try {
  //     await writeFileAsync(fileName, output);
  //     console.log(`Message written to file: ${fileName}`);
  //   } catch (error) {
  //     console.error(`Error writing to file: ${error}`);
  //   }
  // }

  async createTestSuitFile(): Promise<void> {
    const fileName = './src/unitTestSuite.ts';
    const writeStream = createWriteStream(fileName);

    writeStream.on('finish', () => {
      console.log(`Message written to file: ${fileName}`);
    });

    writeStream.on('error', (error) => {
      console.error(`Error writing to file: ${error}`);
    });

    if (output) {
      writeStream.write(output);
    }

    writeStream.end();
  }
}
