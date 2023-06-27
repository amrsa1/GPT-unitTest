import { OpenAPI } from "./op";

const path = './src/accessibility-page.component.ts';
const framework = 'mocha';

const open = new OpenAPI();

(async () => {
  try {
    await open.readFileAsCode(path).then(async (res) => {
      console.log(res)
      const token = await open.countTokens(res)
      await open.generateUnitTest(framework, path, res, token);
    });
    await open.createTestSuitFile();
  } catch (error) {
    console.error(error);
  }
})();