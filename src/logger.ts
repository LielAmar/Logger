import fs, { WriteStream } from "fs";
import path from "path";
import compressing from "compressing";

interface LoggerSettings {
  consoleLog?: boolean,
  includeObjects?: boolean
}

enum LogType {
  INFO,
  WARN,
  DEBUG,
  ERROR
}

interface LogFile {
  filePath: string,
  fileName: string,
  writeStream: WriteStream
}

const parseMonth = (month: number): string => {
  switch(month) {
    case 2: return "February";
    case 3: return "March";
    case 4: return "April";
    case 5: return "May";
    case 6: return "June";
    case 7: return "July";
    case 8: return "August";
    case 9: return "September";
    case 10: return "October";
    case 11: return "November";
    case 12: return "December";
    default: return "January";
  }
}

const beautifyNumber = (number: number): string => {
  return ('0' + number).slice(-2);
}

const getDate = (): string => {
  return new Date().toISOString();
}

export default class Logger {
  private namespace: string;
  private logsPath: string;

  private template: string = "[%date%] [%type%] [%namespace%] [%message%]";
  private settings: LoggerSettings = { consoleLog: true, includeObjects: true };

  private currentDay: number = 0;
  private logFiles = new Map<LogType, LogFile>();

  constructor(namespace: string, logsPath: string, settings?: LoggerSettings, template?: string) {
    this.namespace = namespace;
    this.logsPath = logsPath;

    template && (this.template = template);
    settings && (this.settings = settings);

    this.loadFiles(new Date());
  }

  private assembleTemplate(type: LogType, message: string): string {
    return this.template
      .replace(/%date%/g, getDate())
      .replace(/%type%/g, type.toString())
      .replace(/%namespace%/g, this.namespace)
      .replace(/%message%/g, message);
  }

  private async loadFiles(date: Date) {
    this.currentDay = date.getDay();

    const logDir = path.join(date.getFullYear().toString(), parseMonth(date.getMonth()));
    const logName = beautifyNumber(date.getDay()) + "-" + beautifyNumber(date.getHours()) + "_" + beautifyNumber(date.getMinutes()) + ".log";

    const infoPath = path.join(this.logsPath, "info", logDir);
    const warnPath = path.join(this.logsPath, "warn",logDir);
    const debugPath = path.join(this.logsPath, "debug",logDir);
    const errorPath = path.join(this.logsPath, "error",logDir);

    fs.mkdirSync(infoPath, { recursive: true });
    fs.mkdirSync(warnPath, { recursive: true });
    fs.mkdirSync(debugPath, { recursive: true });
    fs.mkdirSync(errorPath, { recursive: true });

    this.logFiles.set(LogType.INFO, { filePath: infoPath, fileName: logName, writeStream: fs.createWriteStream(path.join(infoPath, logName), { flags: "w" }) });
    this.logFiles.set(LogType.WARN, { filePath: warnPath, fileName: logName, writeStream: fs.createWriteStream(path.join(warnPath, logName), { flags: "w" }) });
    this.logFiles.set(LogType.DEBUG, { filePath: debugPath, fileName: logName, writeStream: fs.createWriteStream(path.join(debugPath, logName), { flags: "w" }) });
    this.logFiles.set(LogType.ERROR, { filePath: errorPath, fileName: logName, writeStream: fs.createWriteStream(path.join(errorPath, logName), { flags: "w" }) });
  }

  private async compressFile(type: LogType) {
    let file = this.logFiles.get(type);

    if(file) {
      compressing.gzip.compressFile(path.join(file.filePath, file.fileName), path.join(file.filePath, file.fileName + ".gz"))
        .then(() => {
          // if(file) {
          //   fs.unlink(path.join(file?.filePath, file?.fileName), (err) => {
          //     if(err)
          //       throw err;
          //   });
          // }
        })
        .catch(error => {
          console.error(`Couldn't compress file ` + file?.filePath + "/" + file?.fileName, error);
        })
    }
  }

  private async compressFiles() {
    await this.compressFile(LogType.INFO);
    await this.compressFile(LogType.WARN);
    await this.compressFile(LogType.DEBUG);
    await this.compressFile(LogType.ERROR);
  }

  private async reloadFiles() {
    const newDate = new Date();

    if(newDate.getDay() !== this.currentDay) {
      this.compressFiles();
      this.loadFiles(newDate);
    }
  }

  private async logToConsole(func: (...data: any[]) => void, templated: string, object?: object) {
    if(this.settings.includeObjects && object)
      return func(templated, object);

    return func(templated);
  }

  private async logToFile(type: LogType, templated: string, object?: object) {
    const file = this.logFiles.get(type);

    if(file) {
      if(this.settings.includeObjects && object)
        file.writeStream.write(templated + `[${JSON.stringify(object)}]\n`);
      else
        file.writeStream.write(templated + `\n`);
    }

    this.reloadFiles();
  }

  /**
   * Logs an info message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async info(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.INFO, message);

    if(this.settings.consoleLog)
      this.logToConsole(console.info, templated, object);
  
    this.logToFile(LogType.INFO, templated, object);
  }

  /**
   * Logs a warn message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async warn(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.WARN, message);

    if(this.settings.consoleLog)
      this.logToConsole(console.warn, templated, object);
  
    this.logToFile(LogType.WARN, templated, object);
  }

  /**
   * Logs a debug message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */  
  public async debug(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.DEBUG, message);

    if(this.settings.consoleLog)
      this.logToConsole(console.debug, templated, object);
  
    this.logToFile(LogType.DEBUG, templated, object);
  }

  /**
   * Logs an error message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async error(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.ERROR, message);

    if(this.settings.consoleLog)
      this.logToConsole(console.error, templated, object);
  
    this.logToFile(LogType.ERROR, templated, object);
  }
}