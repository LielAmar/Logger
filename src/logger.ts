import fs, { WriteStream } from "fs";
import path from "path";
import compressing from "compressing";

interface LoggerSettings {
  logToFiles?: boolean,
  logToConsole?: boolean,
  logObjects?: boolean
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
    case 1: return "February";
    case 2: return "March";
    case 3: return "April";
    case 4: return "May";
    case 5: return "June";
    case 6: return "July";
    case 7: return "August";
    case 8: return "September";
    case 9: return "October";
    case 10: return "November";
    case 11: return "December";
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
  private settings: LoggerSettings = { logToFiles: true, logToConsole: true, logObjects: true };

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


  private async reloadFiles() {
    const newDate = new Date();

    if(newDate.getDate() !== this.currentDay) {
      await this.compressFiles();
      await this.loadFiles(newDate);
    }
  }

  private async loadFiles(date: Date) {
    this.currentDay = date.getDate();

    const logDir = path.join(date.getFullYear().toString(), parseMonth(date.getMonth()));
    const logName = beautifyNumber(date.getDate()) + "-" + beautifyNumber(date.getHours()) + "_" + beautifyNumber(date.getMinutes()) + ".log";

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


  private async compressFiles() {
    try {
      await this.compressFile(LogType.INFO);
      await this.compressFile(LogType.WARN);
      await this.compressFile(LogType.DEBUG);
      await this.compressFile(LogType.ERROR);
    } catch(exception) {
      throw exception;
    }
  }

  private async compressFile(type: LogType): Promise<LogFile> {
    return new Promise(async (resolve, reject) => {
      let file = this.logFiles.get(type);

      if(file) {
        try {
          await compressing.gzip.compressFile(path.join(file.filePath, file.fileName), path.join(file.filePath, file.fileName + ".gz"));
  
          file.writeStream.end();
          fs.unlink(path.join(file?.filePath, file?.fileName), () => {});

          return resolve(file);
        } catch(exception) {
          return reject(exception)
        }
      }
    });
  }


  private async logToConsole(func: (...data: any[]) => void, templated: string, object?: object) {
    if(this.settings.logObjects && object)
      return func(templated, object);

    return func(templated);
  }

  private async logToFile(type: LogType, templated: string, object?: object) {
    const file = this.logFiles.get(type);

    if(file) {
      if(this.settings.logObjects && object)
        file.writeStream.write(templated + `[${JSON.stringify(object)}]\n`);
      else
        file.writeStream.write(templated + `\n`);
    }

    await this.reloadFiles();
  }

  /**
   * Logs an info message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async info(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.INFO, message);

    if(this.settings.logToConsole)
      await this.logToConsole(console.info, templated, object);
  
    if(this.settings.logToFiles)
      await this.logToFile(LogType.INFO, templated, object);
  }

  /**
   * Logs a warn message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async warn(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.WARN, message);

    if(this.settings.logToConsole)
      await this.logToConsole(console.warn, templated, object);
  
    if(this.settings.logToFiles)
      await this.logToFile(LogType.WARN, templated, object);
  }

  /**
   * Logs a debug message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */  
  public async debug(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.DEBUG, message);

    if(this.settings.logToConsole)
      await this.logToConsole(console.debug, templated, object);
  
    if(this.settings.logToFiles)
      await this.logToFile(LogType.DEBUG, templated, object);
  }

  /**
   * Logs an error message
   * 
   * @param message   Message to log 
   * @param object    <Optional> Additional object to log 
   */
  public async error(message: string, object?: object | undefined) {
    const templated = this.assembleTemplate(LogType.ERROR, message);

    if(this.settings.logToConsole)
      await this.logToConsole(console.error, templated, object);
  
    if(this.settings.logToFiles)
      await this.logToFile(LogType.ERROR, templated, object);
  }
}