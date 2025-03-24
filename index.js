const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const readline = require('readline/promises');

// Получение имени пользователя из аргументов командной строки
let username;
process.argv.forEach(arg => {
  if (arg.startsWith('--username=')) {
    username = arg.split('=')[1];
  }
});
if (!username) {
  console.error('Username not provided');
  process.exit(1);
}

// Установка начального рабочего каталога — домашняя директория пользователя
let currentDir = os.homedir();

// Создание интерфейса для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Обработка команд
async function handleCommand(command, args) {
  switch (command) {
    // Навигация: переход на уровень вверх
    case 'up':
      const parentDir = path.dirname(currentDir);
      if (parentDir !== currentDir) {
        currentDir = parentDir;
      }
      break;

    // Навигация: переход в указанную директорию
    case 'cd':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const targetDir = path.resolve(currentDir, args[0]);
      try {
        const stats = await fsPromises.stat(targetDir);
        if (stats.isDirectory()) {
          currentDir = targetDir;
        } else {
          console.error('Operation failed');
        }
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Навигация: список файлов и папок в текущей директории
    case 'ls':
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        const dirs = [];
        const files = [];
        for (const entry of entries) {
          if (entry.isDirectory()) {
            dirs.push(entry.name);
          } else if (entry.isFile()) {
            files.push(entry.name);
          }
        }
        dirs.sort();
        files.sort();
        console.log('Directories:');
        dirs.forEach(dir => console.log(`  ${dir} (dir)`));
        console.log('Files:');
        files.forEach(file => console.log(`  ${file} (file)`));
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: чтение файла
    case 'cat':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const filePath = path.resolve(currentDir, args[0]);
      try {
        const readStream = fs.createReadStream(filePath);
        await pipeline(readStream, process.stdout);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: создание пустого файла
    case 'add':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const fileName = args[0];
      const newFilePath = path.join(currentDir, fileName);
      try {
        const fd = await fsPromises.open(newFilePath, 'wx');
        await fd.close();
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: переименование файла
    case 'rn':
      if (args.length !== 2) {
        console.error('Invalid input');
        return;
      }
      const oldPath = path.resolve(currentDir, args[0]);
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, args[1]);
      try {
        await fsPromises.rename(oldPath, newPath);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: копирование файла
    case 'cp':
      if (args.length !== 2) {
        console.error('Invalid input');
        return;
      }
      const srcPath = path.resolve(currentDir, args[0]);
      const destDir = path.resolve(currentDir, args[1]);
      try {
        const stats = await fsPromises.stat(destDir);
        if (!stats.isDirectory()) {
          console.error('Operation failed: destination is not a directory');
          return;
        }
        const fileName = path.basename(srcPath);
        const destPath = path.join(destDir, fileName);
        const readStream = fs.createReadStream(srcPath);
        const writeStream = fs.createWriteStream(destPath);
        await pipeline(readStream, writeStream);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: перемещение файла
    case 'mv':
      if (args.length !== 2) {
        console.error('Invalid input');
        return;
      }
      const srcPathMv = path.resolve(currentDir, args[0]);
      const destDirMv = path.resolve(currentDir, args[1]);
      try {
        const stats = await fsPromises.stat(destDirMv);
        if (!stats.isDirectory()) {
          console.error('Operation failed: destination is not a directory');
          return;
        }
        const fileNameMv = path.basename(srcPathMv);
        const destPathMv = path.join(destDirMv, fileNameMv);
        const readStreamMv = fs.createReadStream(srcPathMv);
        const writeStreamMv = fs.createWriteStream(destPathMv);
        await pipeline(readStreamMv, writeStreamMv);
        await fsPromises.unlink(srcPathMv);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Операции с файлами: удаление файла
    case 'rm':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const filePathRm = path.resolve(currentDir, args[0]);
      try {
        await fsPromises.unlink(filePathRm);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Информация об ОС
    case 'os':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const subcommand = args[0];
      switch (subcommand) {
        case '--EOL':
          console.log(JSON.stringify(os.EOL));
          break;
        case '--cpus':
          const cpus = os.cpus();
          console.log(`Number of CPUs: ${cpus.length}`);
          cpus.forEach((cpu, index) => {
            console.log(`CPU ${index}: ${cpu.model}, ${cpu.speed / 1000} GHz`);
          });
          break;
        case '--homedir':
          console.log(os.homedir());
          break;
        case '--username':
          console.log(os.userInfo().username);
          break;
        case '--architecture':
          console.log(os.arch());
          break;
        default:
          console.error('Invalid input');
      }
      break;

    // Вычисление хэша
    case 'hash':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const filePathHash = path.resolve(currentDir, args[0]);
      try {
        const hash = crypto.createHash('sha256');
        await pipeline(fs.createReadStream(filePathHash), hash);
        console.log(hash.digest('hex'));
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Сжатие файла
    case 'compress':
      if (args.length !== 2) {
        console.error('Invalid input');
        return;
      }
      const srcPathCompress = path.resolve(currentDir, args[0]);
      const destPathCompress = path.resolve(currentDir, args[1]);
      try {
        const readStreamCompress = fs.createReadStream(srcPathCompress);
        const writeStreamCompress = fs.createWriteStream(destPathCompress);
        const brotliCompress = zlib.createBrotliCompress();
        await pipeline(readStreamCompress, brotliCompress, writeStreamCompress);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    // Распаковка файла
    case 'decompress':
      if (args.length !== 2) {
        console.error('Invalid input');
        return;
      }
      const srcPathDecompress = path.resolve(currentDir, args[0]);
      const destPathDecompress = path.resolve(currentDir, args[1]);
      try {
        const readStreamDecompress = fs.createReadStream(srcPathDecompress);
        const writeStreamDecompress = fs.createWriteStream(destPathDecompress);
        const brotliDecompress = zlib.createBrotliDecompress();
        await pipeline(readStreamDecompress, brotliDecompress, writeStreamDecompress);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    default:
      console.error('Invalid input');
  }
}

// Главная функция
async function main() {
  console.log(`Welcome to the File Manager, ${username}!`);
  console.log(`You are currently in ${currentDir}`);

  while (true) {
    const input = await rl.question('> ');
    const [command, ...args] = input.trim().split(' ');

    if (command === '.exit') {
      console.log(`Thank you for using File Manager, ${username}, goodbye!`);
      rl.close();
      process.exit(0);
    }

    try {
      await handleCommand(command, args);
    } catch (error) {
      console.error('Operation failed');
    }

    console.log(`You are currently in ${currentDir}`);
  }
}

// Запуск программы и обработка ошибок
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});

// Обработка завершения программы через Ctrl+C
process.on('SIGINT', () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  rl.close();
  process.exit(0);
});