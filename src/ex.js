const OpenAPI = require("./op");

const path = './src/dummyFunc.js'
const framework = 'mocha'

const open = new OpenAPI();

  (async () => {
    try {
      const code = await open.readFileAsCode(path);
      await open.generateUnitTest(code, framework, path);
      await open.createTestSuitFile();
    } catch (error) {
      console.error(error);
    }
  })();
