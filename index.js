const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const readline = require('readline/promises');

let username;
process.argv.forEach(arg => {
  if (arg.startsWith('--username=')) {
    username = arg.split('=')[1];
  }
});
if (!username) {
  console.error('Username пустой');
  process.exit(1);
}

let currentDir = os.homedir();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function handleCommand(command, args) {
  switch (command) {
    case 'up':
      const parentDir = path.dirname(currentDir);
      if (parentDir !== currentDir) {
        currentDir = parentDir;
      }
      break;

    case 'cd':
      if (args.length !== 1) {
        console.error('ошибка ввода');
        return;
      }
      const targetDir = path.resolve(currentDir, args[0]);
      try {
        const stats = await fsPromises.stat(targetDir);
        if (stats.isDirectory()) {
          currentDir = targetDir;
        } else {
          console.error('Ошибка');
        }
      } catch (error) {
        console.error(error);
      }
      break;

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
        console.log('Директории:');
        dirs.forEach(dir => console.log(`  ${dir} (dir)`));
        console.log('Файлы:');
        files.forEach(file => console.log(`  ${file} (file)`));
      } catch (error) {
        console.error(error);
      }
      break;

    case 'cat':
      if (args.length !== 1) {
        console.error('Ошибка ввода');
        return;
      }
      const filePath = path.resolve(currentDir, args[0]);
      try {
        const readStream = fs.createReadStream(filePath);
        await pipeline(readStream, process.stdout);
        console.log(); 
      } catch (error) {
        console.error(error);
      }
      break;

    case 'add':
      if (args.length !== 1) {
        return;
      }
      const fileName = args[0];
      const newFilePath = path.join(currentDir, fileName);
      try {
        const fd = await fsPromises.open(newFilePath, 'wx');
        await fd.close();
      } catch (error) {
        console.error(error);
      }
      break;

    case 'rn':
      if (args.length !== 2) {
        return;
      }
      const oldPath = path.resolve(currentDir, args[0]);
      const newFileName = args[1];
      const newPath = path.join(path.dirname(oldPath), newFileName);
      try {
        await fsPromises.rename(oldPath, newPath);
      } catch (error) {
        console.error(error);
      }
      break;

    case 'cp':
      if (args.length !== 2) {
        return;
      }
      const sourcePath = path.resolve(currentDir, args[0]);
      const destPath = path.resolve(currentDir, args[1]);
      try {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(destPath);
        await pipeline(readStream, writeStream);
      } catch (error) {
        console.error(error);
      }
      break;

    case 'mv':
      if (args.length !== 2) {
        return;
      }
      const moveSourcePath = path.resolve(currentDir, args[0]);
      const moveDestPath = path.resolve(currentDir, args[1]);
      try {
        const readStream = fs.createReadStream(moveSourcePath);
        const writeStream = fs.createWriteStream(moveDestPath);
        await pipeline(readStream, writeStream);
        await fsPromises.unlink(moveSourcePath);
      } catch (error) {
        console.error(error);
      }
      break;

    case 'rm':
      if (args.length !== 1) {
        return;
      }
      const deletePath = path.resolve(currentDir, args[0]);
      try {
        await fsPromises.unlink(deletePath);
      } catch (error) {
        console.error(error);
      }
      break;

    case 'os':
      if (args.length !== 1) {
        return;
      }
      switch (args[0]) {
        case '--EOL':
          console.log(JSON.stringify(os.EOL));
          break;
        case '--cpus':
          const cpus = os.cpus();
          console.log(`Total CPUs: ${cpus.length}`);
          cpus.forEach((cpu, index) => {
            console.log(`CPU ${index + 1}: ${cpu.model} @ ${cpu.speed / 1000} GHz`);
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
          console.error('Ошибка');
      }
      break;

    case 'hash':
      if (args.length !== 1) {
        return;
      }
      const hashPath = path.resolve(currentDir, args[0]);
      try {
        const readStream = fs.createReadStream(hashPath);
        const hash = crypto.createHash('sha256');
        readStream.pipe(hash);
        readStream.on('end', () => {
          console.log(hash.digest('hex'));
        });
      } catch (error) {
        console.error(error);
      }
      break;

    case 'compress':
      if (args.length !== 2) {
        return;
      }
      const compressSource = path.resolve(currentDir, args[0]);
      const compressDest = path.resolve(currentDir, args[1]);
      try {
        const readStream = fs.createReadStream(compressSource);
        const writeStream = fs.createWriteStream(compressDest);
        const brotliCompress = zlib.createBrotliCompress();
        await pipeline(readStream, brotliCompress, writeStream);
      } catch (error) {
        console.error(error);
      }
      break;

    case 'decompress':
      if (args.length !== 2) {
        return;
      }
      const decompressSource = path.resolve(currentDir, args[0]);
      const decompressDest = path.resolve(currentDir, args[1]);
      try {
        const readStream = fs.createReadStream(decompressSource);
        const writeStream = fs.createWriteStream(decompressDest);
        const brotliDecompress = zlib.createBrotliDecompress();
        await pipeline(readStream, brotliDecompress, writeStream);
      } catch (error) {
        console.error(error);
      }
      break;

    default:
      console.error('Invalid input');
  }
}

async function main() {
  console.log(`Привет, ${username}`);
  console.log(`Ты в ${currentDir}`);

  while (true) {
    const input = await rl.question('> ');
    const [command, ...args] = input.trim().split(' ');

    if (command === '.exit') {
      rl.close();
      process.exit(0);
    }

    try {
      await handleCommand(command, args);
    } catch (error) {
      console.error('Ошибка');
    }

    console.log(`Папка ${currentDir}`);
  }
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  rl.close();
  process.exit(0);
});