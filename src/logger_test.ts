import path from "path";

import Logger from "./logger";

const logger = new Logger("Test", path.join(__dirname, "..", "logs"));

// setInterval(async () => {
  // await logger.info("info test");
  // await logger.warn("warn test");
  // await logger.debug("debug test");
  // await logger.error("error test");
// }, 7500);