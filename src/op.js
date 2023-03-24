const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);


let output;

class OpenAPI {
  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  UNIT_TEST_REQUEST = (framework, path, code) => `Generate a unit test with the ${framework} syntax, containing relevant assertions and required packages in a single 'describe' block. Import the functions from ${path} and use them to test the following code snippet: ${code}.`;


  async readFileAsCode(filePath) {
    try {
      const data = await readFileAsync(filePath, 'utf8');
      return data;
    } catch (error) {
      throw new Error(`Error reading file: ${error}`);
    }
  }

  async generateUnitTest(framework, path, code) {
    const spinner = (await import('ora')).default('Please Wait Generating unit test...').start();

    try {
      const response = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{
          "role": "user",
          "content": this.UNIT_TEST_REQUEST(framework, path, code)
        }],
        temperature: 0,
        max_tokens: 1000,
      });

      const { message } = response.data.choices[0];
      output = message.content;

      spinner.succeed('Unit test generated');
    } catch (error) {
      spinner.fail(`Error generating unit test: ${error}`);
    }
  }

  async createTestSuitFile() {
    const fileName = './src/unitTestSuie.js';
    try {
      await fs.promises.writeFile(fileName, output);
      console.log(`Message written to file: ${fileName}`);
    } catch (error) {
      console.error(`Error writing to file: ${error}`);
    }
  }

}

module.exports = OpenAPI;