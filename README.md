# Logger
A simple Logger for NodeJS written in TypeScript

## Instalation
You can install [Logger](https://www.npmjs.com/package/@lielamar/logger) from [npm js](https://www.npmjs.com/).
You need to have [Node](https://nodejs.org/en/) installed on your machine before installing the Logger module.

```bash
$ npm install @lielamar/logger
```

## Usage
To use the Logger module you need to create a file where you will manage your Logger from.
This file should import the Logger module, create an instance of it and then export it.

```js
const Logger = require("@lielamar/logger").default;

const logger = new Logger("Namespace", "path/to/target/folder", { consoleLog: true, includeObjects: true });

logger.info("Hello!");
logger.warn("Hello!");
logger.debug("Hello!");
logger.error("Hello!");

module.exports = logger
```

and then you can use logger from any other class by requiring the previous file.
```js
const logger = require("./logger.js");

logger.info("Hey from another file!");
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
