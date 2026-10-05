import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync('www', { recursive: true });
copyFileSync('index.html', 'www/index.html');
console.log('Jornada 90 web build: index.html -> www/index.html');
